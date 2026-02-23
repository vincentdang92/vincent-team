import { create } from 'zustand';
import { Agent, AgentStatus } from '@prisma/client';

interface AgentStore {
    agents: Agent[];
    activeAgent: Agent | null;
    setAgents: (agents: Agent[]) => void;
    setActiveAgent: (agent: Agent | null) => void;
    updateAgentStatus: (agentId: string, status: AgentStatus) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
    agents: [],
    activeAgent: null,

    setAgents: (agents) => set({ agents }),

    setActiveAgent: (agent) => set({ activeAgent: agent }),

    updateAgentStatus: (agentId, status) =>
        set((state) => ({
            agents: state.agents.map((agent) =>
                agent.id === agentId ? { ...agent, status } : agent
            ),
            activeAgent:
                state.activeAgent?.id === agentId
                    ? { ...state.activeAgent, status }
                    : state.activeAgent,
        })),
}));
