export interface CuratedSkill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: "development" | "review" | "documentation" | "testing" | "devops" | "data";
}

export const curatedSkills: CuratedSkill[] = [
  {
    id: "code-review",
    name: "code-review",
    description: "Review code for bugs, security issues, and best practices",
    prompt: "Review the provided code thoroughly. Check for: bugs, security vulnerabilities, performance issues, and adherence to best practices. Provide specific suggestions for improvement with code examples.",
    category: "review",
  },
  {
    id: "write-tests",
    name: "write-tests",
    description: "Generate unit and integration tests for code",
    prompt: "Write comprehensive tests for the provided code. Include edge cases, error scenarios, and happy paths. Use the testing framework already present in the project. Aim for high coverage of critical logic.",
    category: "testing",
  },
  {
    id: "refactor",
    name: "refactor",
    description: "Refactor code for better readability and maintainability",
    prompt: "Refactor the provided code to improve readability, reduce complexity, and follow clean code principles. Preserve all existing behavior. Explain the reasoning behind each change.",
    category: "development",
  },
  {
    id: "explain-code",
    name: "explain-code",
    description: "Explain code logic and architecture in detail",
    prompt: "Explain the provided code in detail. Describe what each section does, the overall architecture, data flow, and any design patterns used. Use clear language suitable for onboarding a new developer.",
    category: "documentation",
  },
  {
    id: "write-docs",
    name: "write-docs",
    description: "Generate documentation and API docs",
    prompt: "Generate clear, comprehensive documentation for the provided code. Include: purpose, usage examples, parameter descriptions, return values, and any important notes or caveats.",
    category: "documentation",
  },
  {
    id: "debug",
    name: "debug",
    description: "Diagnose and fix bugs with systematic analysis",
    prompt: "Analyze the bug report or error. Systematically identify the root cause by examining the code, tracing data flow, and checking edge cases. Propose a fix with explanation of why the bug occurred and how the fix resolves it.",
    category: "development",
  },
  {
    id: "optimize",
    name: "optimize",
    description: "Optimize code for performance",
    prompt: "Analyze the provided code for performance bottlenecks. Identify inefficient algorithms, unnecessary allocations, redundant computations, or N+1 queries. Propose optimizations with benchmarking suggestions.",
    category: "development",
  },
  {
    id: "security-audit",
    name: "security-audit",
    description: "Audit code for security vulnerabilities",
    prompt: "Perform a security audit of the provided code. Check for OWASP top 10 vulnerabilities including injection, XSS, authentication flaws, sensitive data exposure, and insecure configurations. Rate each finding by severity.",
    category: "review",
  },
  {
    id: "ci-pipeline",
    name: "ci-pipeline",
    description: "Create or improve CI/CD pipeline configuration",
    prompt: "Create or improve the CI/CD pipeline configuration for this project. Include linting, testing, building, and deployment stages. Optimize for speed with caching and parallelization where appropriate.",
    category: "devops",
  },
  {
    id: "data-migration",
    name: "data-migration",
    description: "Generate database migration scripts",
    prompt: "Generate a safe database migration script for the described schema change. Include both up and down migrations. Consider data preservation, index management, and zero-downtime deployment requirements.",
    category: "data",
  },
  {
    id: "api-design",
    name: "api-design",
    description: "Design RESTful API endpoints",
    prompt: "Design a RESTful API for the described requirements. Include endpoint paths, HTTP methods, request/response schemas, error codes, pagination, and authentication. Follow REST best practices and be consistent with existing API patterns in the project.",
    category: "development",
  },
  {
    id: "docker-setup",
    name: "docker-setup",
    description: "Create Dockerfile and docker-compose configuration",
    prompt: "Create an optimized Dockerfile and docker-compose configuration for the project. Use multi-stage builds, proper layer caching, security best practices (non-root user), and health checks.",
    category: "devops",
  },
];
