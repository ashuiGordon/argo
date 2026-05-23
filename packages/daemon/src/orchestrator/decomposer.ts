import type { RawTask } from "./dependency-resolver.js";
import type { DecomposedPlan } from "./coordinator.js";

interface AgentInfo {
  id: string;
  name: string;
  type: string;
  system_prompt: string | null;
}

export function decompose(message: string, agents: AgentInfo[]): DecomposedPlan {
  if (agents.length === 0) {
    return { tasks: [] };
  }

  if (agents.length === 1) {
    return {
      tasks: [{
        title: "Execute request",
        description: message,
        assignee: agents[0].name,
        dependsOn: [],
      }],
    };
  }

  const tasks: RawTask[] = [];
  const sentenceSplitters = /[.;]\s+|(?:and then|after that|then)\s+/i;
  const parts = message.split(sentenceSplitters).filter((p) => p.trim().length > 10);

  if (parts.length >= agents.length) {
    for (let i = 0; i < parts.length; i++) {
      const agent = agents[i % agents.length];
      tasks.push({
        title: `Task ${i + 1}: ${parts[i].trim().slice(0, 50)}`,
        description: parts[i].trim(),
        assignee: agent.name,
        dependsOn: [],
      });
    }
  } else {
    for (let i = 0; i < agents.length; i++) {
      tasks.push({
        title: `${agents[i].name}: process request`,
        description: message,
        assignee: agents[i].name,
        dependsOn: [],
      });
    }
  }

  return { tasks };
}
