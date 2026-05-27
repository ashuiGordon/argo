import type { TeamPreset } from "@argo/shared";

export const TEAM_PRESETS: TeamPreset[] = [
  {
    id: "auto",
    name: "Auto",
    description: "Moderator autonomously decides which agents to involve and in what order",
    roles: ["architect", "planner", "executor", "reviewer", "debugger", "tester", "designer", "ops"],
    pipeline: [],
    moderatorHint: `You have full autonomy to coordinate this team. There is no predefined pipeline.
Analyze the user's request and decide:
- Which agents to involve (you don't need to use all of them)
- In what order to route work
- Whether tasks can be parallelized

Use your judgment: simple tasks may only need Executor. Complex tasks may need Architect → Planner → Executor → Reviewer. Bug reports should go to Debugger first. UI work should involve Designer. When code is ready to commit, route to Ops.

Optimize for speed and quality — skip unnecessary steps, but never skip review for non-trivial changes.`,
  },

  {
    id: "feature",
    name: "Feature",
    description: "Structured pipeline: clarify → plan → implement → test → review → commit",
    roles: ["architect", "planner", "executor", "reviewer", "tester", "ops"],
    pipeline: [
      { name: "clarify", assignTo: "architect", description: "Clarify requirements and identify unknowns", canSkip: true },
      { name: "plan", assignTo: "planner", description: "Create actionable implementation plan with steps and dependencies", canSkip: false },
      { name: "implement", assignTo: "executor", description: "Implement the plan step by step", canSkip: false },
      { name: "test", assignTo: "tester", description: "Write tests to verify the implementation", canSkip: true },
      { name: "review", assignTo: "reviewer", description: "Review code quality, security, and spec compliance", canSkip: false },
      { name: "commit", assignTo: "ops", description: "Commit changes, create branch/PR, verify CI", canSkip: true },
    ],
    moderatorHint: `You are coordinating a Feature Development team. Follow this recommended pipeline:
1. CLARIFY (Architect): Analyze requirements, identify ambiguities. Skip if requirements are crystal clear.
2. PLAN (Planner): Decompose into actionable steps with dependencies.
3. IMPLEMENT (Executor): Execute the plan. Can be parallelized if tasks are independent.
4. TEST (Tester): Write tests for the implementation. Skip for trivial changes.
5. REVIEW (Reviewer): Final quality gate.
6. COMMIT (Ops): Commit code, create PR, verify CI passes. Skip if user wants to commit manually.

You may adapt this flow — skip steps when unnecessary, loop back if review fails, or parallelize independent work. Your job is to deliver a complete, verified feature.`,
  },
];

export function getPreset(id: string): TeamPreset | undefined {
  return TEAM_PRESETS.find((p) => p.id === id);
}

export function getAllPresets(): TeamPreset[] {
  return TEAM_PRESETS;
}
