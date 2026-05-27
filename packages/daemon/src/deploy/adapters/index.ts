import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import type { DeployAdapter, DeployRequest, DeployResult } from "../types.js";

function detectFramework(workspace: string): { name: string; buildCmd: string; distDir: string } | null {
  const pkgPath = resolve(workspace, "package.json");
  if (!existsSync(pkgPath)) return null;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps["next"]) return { name: "next", buildCmd: "npm run build", distDir: ".next" };
  if (deps["vite"]) return { name: "vite", buildCmd: "npm run build", distDir: "dist" };
  if (deps["@angular/core"]) return { name: "angular", buildCmd: "npm run build", distDir: "dist" };
  if (deps["react-scripts"]) return { name: "cra", buildCmd: "npm run build", distDir: "build" };
  if (deps["vue"]) return { name: "vue", buildCmd: "npm run build", distDir: "dist" };
  if (pkg.scripts?.build) return { name: "generic", buildCmd: "npm run build", distDir: "dist" };
  return null;
}

function runCommand(cmd: string, args: string[], cwd: string, onLog: (line: string) => void): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    proc.stdout.on("data", (d) => d.toString().split("\n").filter(Boolean).forEach(onLog));
    proc.stderr.on("data", (d) => d.toString().split("\n").filter(Boolean).forEach(onLog));
    proc.on("close", (code) => resolve(code ?? 1));
  });
}

export class PreviewAdapter implements DeployAdapter {
  readonly type = "preview" as const;
  readonly supportedTargets = ["local" as const];
  private processes = new Map<string, { kill: () => void; port: number }>();

  async execute(request: DeployRequest, onLog: (line: string) => void): Promise<DeployResult> {
    const logs: string[] = [];
    const log = (line: string) => { logs.push(line); onLog(line); };

    const framework = detectFramework(request.workspace);
    if (!framework) {
      log("No supported framework detected");
      return { status: "failed", error: "No supported framework detected", logs };
    }

    log(`Detected framework: ${framework.name}`);
    log(`Running build: ${request.buildCommand || framework.buildCmd}`);

    const buildCmd = request.buildCommand || framework.buildCmd;
    const [cmd, ...args] = buildCmd.split(" ");
    const exitCode = await runCommand(cmd, args, request.workspace, log);

    if (exitCode !== 0) {
      return { status: "failed", error: "Build failed", logs };
    }

    const distPath = resolve(request.workspace, framework.distDir);
    if (!existsSync(distPath)) {
      return { status: "failed", error: `Build output not found at ${framework.distDir}`, logs };
    }

    const port = 3100 + Math.floor(Math.random() * 900);
    log(`Starting preview server on port ${port}...`);

    const serveProc = spawn("npx", ["serve", "-s", distPath, "-l", String(port)], {
      cwd: request.workspace,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });

    this.processes.set(request.id, { kill: () => serveProc.kill(), port });

    await new Promise((r) => setTimeout(r, 2000));

    const url = `http://localhost:${port}`;
    log(`Preview available at: ${url}`);

    return {
      status: "deployed",
      url,
      logs,
      metadata: { port, framework: framework.name, distDir: framework.distDir },
    };
  }

  async cleanup(deploymentId: string) {
    const proc = this.processes.get(deploymentId);
    if (proc) {
      proc.kill();
      this.processes.delete(deploymentId);
    }
  }
}

export class StaticSiteAdapter implements DeployAdapter {
  readonly type = "static" as const;
  readonly supportedTargets = ["vercel" as const, "netlify" as const];

  async execute(request: DeployRequest, onLog: (line: string) => void): Promise<DeployResult> {
    const logs: string[] = [];
    const log = (line: string) => { logs.push(line); onLog(line); };

    const framework = detectFramework(request.workspace);
    if (framework) {
      log(`Building with: ${request.buildCommand || framework.buildCmd}`);
      const buildCmd = request.buildCommand || framework.buildCmd;
      const [cmd, ...args] = buildCmd.split(" ");
      const exitCode = await runCommand(cmd, args, request.workspace, log);
      if (exitCode !== 0) {
        return { status: "failed", error: "Build failed", logs };
      }
    }

    if (request.target === "vercel") {
      return this.deployVercel(request, log, logs);
    } else {
      return this.deployNetlify(request, log, logs);
    }
  }

  private async deployVercel(request: DeployRequest, log: (s: string) => void, logs: string[]): Promise<DeployResult> {
    log("Deploying to Vercel...");
    const exitCode = await runCommand("npx", ["vercel", "--yes", "--prod"], request.workspace, log);

    if (exitCode !== 0) {
      return { status: "failed", error: "Vercel deploy failed. Ensure `vercel` is configured.", logs };
    }

    const urlLine = logs.find((l) => l.includes("https://") && l.includes(".vercel.app"));
    const url = urlLine?.match(/https:\/\/[^\s]+/)?.[0];

    return { status: "deployed", url, logs };
  }

  private async deployNetlify(request: DeployRequest, log: (s: string) => void, logs: string[]): Promise<DeployResult> {
    log("Deploying to Netlify...");
    const framework = detectFramework(request.workspace);
    const distDir = framework?.distDir || "dist";

    const exitCode = await runCommand(
      "npx", ["netlify", "deploy", "--prod", "--dir", distDir],
      request.workspace, log,
    );

    if (exitCode !== 0) {
      return { status: "failed", error: "Netlify deploy failed. Ensure `netlify` CLI is configured.", logs };
    }

    const urlLine = logs.find((l) => l.includes("https://") && l.includes("netlify"));
    const url = urlLine?.match(/https:\/\/[^\s]+/)?.[0];

    return { status: "deployed", url, logs };
  }
}

export class ContainerAdapter implements DeployAdapter {
  readonly type = "container" as const;
  readonly supportedTargets = ["docker" as const, "fly" as const];

  async execute(request: DeployRequest, onLog: (line: string) => void): Promise<DeployResult> {
    const logs: string[] = [];
    const log = (line: string) => { logs.push(line); onLog(line); };

    const projectName = basename(request.workspace).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const imageTag = `${projectName}:latest`;

    const hasDockerfile = existsSync(resolve(request.workspace, "Dockerfile"));
    if (!hasDockerfile) {
      log("No Dockerfile found, generating one...");
      const framework = detectFramework(request.workspace);
      const dockerfile = generateDockerfile(framework?.name || "generic");
      const { writeFileSync } = await import("node:fs");
      writeFileSync(resolve(request.workspace, "Dockerfile"), dockerfile);
      log("Generated Dockerfile");
    }

    log(`Building Docker image: ${imageTag}`);
    const buildExit = await runCommand("docker", ["build", "-t", imageTag, "."], request.workspace, log);
    if (buildExit !== 0) {
      return { status: "failed", error: "Docker build failed", logs };
    }

    if (request.target === "fly") {
      return this.deployFly(request, log, logs, projectName);
    }

    log("Running container locally...");
    const port = 8080 + Math.floor(Math.random() * 900);
    const runExit = await runCommand(
      "docker", ["run", "-d", "--name", `argo-${request.id.slice(0, 8)}`, "-p", `${port}:3000`, imageTag],
      request.workspace, log,
    );

    if (runExit !== 0) {
      return { status: "failed", error: "Docker run failed", logs };
    }

    const url = `http://localhost:${port}`;
    log(`Container running at: ${url}`);

    return { status: "deployed", url, logs, metadata: { imageTag, port } };
  }

  private async deployFly(request: DeployRequest, log: (s: string) => void, logs: string[], appName: string): Promise<DeployResult> {
    log("Deploying to Fly.io...");
    const exitCode = await runCommand("fly", ["deploy", "--app", appName, "--now"], request.workspace, log);
    if (exitCode !== 0) {
      return { status: "failed", error: "Fly.io deploy failed. Ensure `fly` CLI is configured.", logs };
    }

    const url = `https://${appName}.fly.dev`;
    log(`Deployed to: ${url}`);
    return { status: "deployed", url, logs };
  }

  async cleanup(deploymentId: string) {
    const containerName = `argo-${deploymentId.slice(0, 8)}`;
    spawn("docker", ["rm", "-f", containerName], { stdio: "ignore" });
  }
}

function generateDockerfile(framework: string): string {
  if (framework === "next") {
    return `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
`;
  }
  return `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
`;
}

export class PackageAdapter implements DeployAdapter {
  readonly type = "package" as const;
  readonly supportedTargets = ["zip" as const, "tar" as const];

  async execute(request: DeployRequest, onLog: (line: string) => void): Promise<DeployResult> {
    const logs: string[] = [];
    const log = (line: string) => { logs.push(line); onLog(line); };

    const projectName = basename(request.workspace);
    const outDir = resolve(request.workspace, ".argo-deploy");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(outDir, { recursive: true });

    let filename: string;
    let exitCode: number;

    if (request.target === "tar") {
      filename = `${projectName}.tar.gz`;
      log(`Creating archive: ${filename}`);
      exitCode = await runCommand(
        "tar", ["--exclude=node_modules", "--exclude=.git", "--exclude=.argo-deploy", "-czf", resolve(outDir, filename), "."],
        request.workspace, log,
      );
    } else {
      filename = `${projectName}.zip`;
      log(`Creating archive: ${filename}`);
      exitCode = await runCommand(
        "zip", ["-r", resolve(outDir, filename), ".", "-x", "node_modules/*", ".git/*", ".argo-deploy/*"],
        request.workspace, log,
      );
    }

    if (exitCode !== 0) {
      return { status: "failed", error: `Failed to create ${filename}`, logs };
    }

    const filePath = resolve(outDir, filename);
    const url = `/downloads/${request.id}/${filename}`;
    log(`Package created: ${filePath}`);

    return {
      status: "deployed",
      url,
      logs,
      metadata: { filename, filePath, size: (await import("node:fs")).statSync(filePath).size },
    };
  }
}
