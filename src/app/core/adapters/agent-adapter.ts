import { AgentModel } from '../models/agent-model';

export function adaptAgent(rawAgent: any): AgentModel {
  const agent = rawAgent ?? {};
  return {
    agent_id: agent.agent_id ?? agent.id ?? '',
    name: agent.name ?? 'Agent',
    model: {
      name: agent.model?.name ?? agent.model?.model ?? 'unknown',
      model: agent.model?.model ?? agent.model?.name ?? 'unknown',
      provider: agent.model?.provider ?? 'unknown',
    },
    add_context: !!agent.add_context,
    tools: Array.isArray(agent.tools)
      ? agent.tools.map((tool: any) => ({
          name: tool?.name ?? 'tool',
          parameters: {
            type: tool?.parameters?.type ?? 'object',
            properties: tool?.parameters?.properties ?? {},
            required: tool?.parameters?.required ?? [],
          },
          requires_confirmation: !!tool?.requires_confirmation,
          external_execution: !!tool?.external_execution,
        }))
      : [],
    memory: agent.memory ?? null,
    storage:
      typeof agent.storage === 'object' && agent.storage !== null
        ? { name: agent.storage.name ?? 'default' }
        : { name: agent.storage ? 'enabled' : 'disabled' },
    knowledge: agent.knowledge ?? null,
    description: agent.description ?? null,
    instructions: (() => {
      if (Array.isArray(agent.instructions)) return agent.instructions;
      if (agent.instructions) return [String(agent.instructions)];
      return [];
    })(),
  };
}

export function adaptAgents(rawAgents: any[]): AgentModel[] {
  return rawAgents.map((agent) => adaptAgent(agent));
}
