/**
 * Model config persistence — read/write per-agent model config from DB
 */

import { prisma } from './prisma';
import { ModelConfig, ModelProvider } from './model-router';

export interface AgentModelConfig extends ModelConfig {
    agentId: string;
}

// Get model config for a specific agent
export async function getAgentModelConfig(agentId: string): Promise<ModelConfig> {
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { config: true },
    });

    const cfg = agent?.config as Record<string, unknown> | null;
    if (!cfg || !cfg.provider) {
        // Default to env-based config
        return {
            provider: (process.env.ACTIVE_MODEL as ModelProvider) ?? ModelProvider.CLAUDE,
        };
    }

    return {
        provider: cfg.provider as ModelProvider,
        model: cfg.model as string | undefined,
        apiKey: cfg.apiKey as string | undefined,   // ← include saved key
        temperature: cfg.temperature as number | undefined,
        maxTokens: cfg.maxTokens as number | undefined,
    };
}

// Update model config for a specific agent
export async function setAgentModelConfig(
    agentId: string,
    config: Partial<ModelConfig>
): Promise<void> {
    // Get current config first
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { config: true },
    });

    const current = (agent?.config as Record<string, unknown>) ?? {};
    const updated = { ...current, ...config };

    await prisma.agent.update({
        where: { id: agentId },
        data: { config: updated },
    });
}

// Get model configs for all agents at once (for the dashboard)
export async function getAllAgentModelConfigs(): Promise<
    Record<string, ModelConfig>
> {
    const agents = await prisma.agent.findMany({
        select: { id: true, name: true, config: true },
    });

    const result: Record<string, ModelConfig> = {};
    const defaultProvider =
        (process.env.ACTIVE_MODEL as ModelProvider) ?? ModelProvider.CLAUDE;

    for (const agent of agents) {
        const cfg = agent.config as Record<string, unknown> | null;
        result[agent.id] = {
            provider: (cfg?.provider as ModelProvider) ?? defaultProvider,
            model: cfg?.model as string | undefined,
            temperature: cfg?.temperature as number | undefined,
            maxTokens: cfg?.maxTokens as number | undefined,
        };
    }

    return result;
}
