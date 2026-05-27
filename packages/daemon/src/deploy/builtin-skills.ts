import type { SkillConfig } from "@argo/shared";

export const BUILTIN_SKILLS: SkillConfig[] = [
  {
    name: "deploy-preview",
    description: "Build the project and start a local preview server with a shareable URL",
    prompt: `When the user asks to preview or test the project locally:
1. Determine the workspace path from the current conversation context.
2. Call the Argo deploy API: POST /api/deployments with body:
   { "conversationId": "<current>", "type": "preview", "target": "local", "workspace": "<path>" }
3. Monitor the deployment status and report the preview URL when ready.
4. If build fails, report the error and suggest fixes.`,
  },
  {
    name: "deploy-static",
    description: "Deploy the project as a static site to Vercel or Netlify",
    prompt: `When the user asks to deploy to Vercel or Netlify:
1. Determine target platform (default: vercel). Ask if unclear.
2. Determine the workspace path from the current conversation context.
3. Call the Argo deploy API: POST /api/deployments with body:
   { "conversationId": "<current>", "type": "static", "target": "vercel"|"netlify", "workspace": "<path>" }
4. Monitor the deployment and report the production URL when complete.
5. If deployment fails, check that the CLI is authenticated and report actionable steps.`,
  },
  {
    name: "deploy-container",
    description: "Build a Docker image and optionally deploy to Fly.io",
    prompt: `When the user asks to containerize or deploy with Docker:
1. Determine target: "docker" for local container, "fly" for Fly.io deployment.
2. Determine the workspace path from the current conversation context.
3. Call the Argo deploy API: POST /api/deployments with body:
   { "conversationId": "<current>", "type": "container", "target": "docker"|"fly", "workspace": "<path>" }
4. If no Dockerfile exists, one will be auto-generated. Report what was generated.
5. Report the running container URL or Fly.io URL when complete.`,
  },
  {
    name: "deploy-package",
    description: "Package the project source code as a downloadable ZIP or TAR archive",
    prompt: `When the user asks to package, archive, or download the source:
1. Determine format: "zip" (default) or "tar".
2. Determine the workspace path from the current conversation context.
3. Call the Argo deploy API: POST /api/deployments with body:
   { "conversationId": "<current>", "type": "package", "target": "zip"|"tar", "workspace": "<path>" }
4. Report the download link when the archive is ready.`,
  },
];
