// Agent Types
export type { Agent, AgentType, AgentStatus } from '@prisma/client';
import type { AgentType } from '@prisma/client';


export interface AgentConfig {
    maxConcurrentTasks?: number;
    timeout?: number;
    retryAttempts?: number;
}

export interface AgentContext {
    agentId: string;
    vpsId?: string;
    deploymentId?: string;
}

// Base Agent Interface
export interface IAgent {
    id: string;
    name: string;
    type: AgentType;
    execute(input: string, context: AgentContext): Promise<AgentResult>;
    logReasoning(message: string, context: AgentContext): Promise<void>;
}

export interface AgentResult {
    success: boolean;
    output?: string;
    error?: string;
    commandId?: string;
}
