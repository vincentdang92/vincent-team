/**
 * Model config persistence — read/write per-agent model config from DB.
 *
 * ── API-key layout in DB (config JSON) ──────────────────────────────────────
 *   cfg.apiKeys = { GEMINI: "AIza…", CLAUDE: "sk-ant-…", OLLAMA: "…", … }
 *
 * Each provider has its own slot so switching provider doesn't reuse a key
 * meant for a different service.  Legacy single cfg.apiKey is still read for
 * backward-compat with existing rows.
 */

import { prisma } from './prisma';
import { ModelConfig, ModelProvider } from './model-router';

export interface AgentModelConfig extends ModelConfig {
    agentId: string;
}

/** Resolve the correct API key for the given provider from the config JSON. */
function resolveApiKey(
    cfg: Record<string, unknown>,
    provider: ModelProvider,
): string | undefined {
    // New format: per-provider map
    const apiKeys = cfg.apiKeys as Record<string, string> | undefined;
    if (apiKeys?.[provider]) return apiKeys[provider];

    // Legacy fallback: single top-level apiKey (only use if provider matches
    // the one that was saved — guarded by cfg.provider check)
    const legacyKey = cfg.apiKey as string | undefined;
    if (legacyKey && cfg.provider === provider) return legacyKey;

    return undefined;
}

/** Build a masked hint (e.g. "sk-a••••••••b3f2") for display purposes. */
export function maskKey(key: string | undefined): string | null {
    if (!key) return null;
    return key.length >= 8
        ? `${key.slice(0, 4)}••••••••${key.slice(-4)}`
        : '••••••••';
}

// ─────────────────────────────────────────────────────────────────────────────

/** Get the resolved ModelConfig for a specific agent. */
export async function getAgentModelConfig(agentId: string): Promise<ModelConfig> {
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { config: true },
    });

    const cfg = agent?.config as Record<string, unknown> | null;
    if (!cfg || !cfg.provider) {
        return {
            provider: (process.env.ACTIVE_MODEL as ModelProvider) ?? ModelProvider.CLAUDE,
        };
    }

    const provider = cfg.provider as ModelProvider;

    return {
        provider,
        model: cfg.model as string | undefined,
        apiKey: resolveApiKey(cfg, provider),   // ← provider-specific key
        temperature: cfg.temperature as number | undefined,
        maxTokens: cfg.maxTokens as number | undefined,
    };
}

/**
 * Persist a model config change for an agent.
 * When `config.apiKey` is provided it is stored in `apiKeys[provider]`
 * and NOT in the legacy top-level field, so other providers keep their keys.
 */
export async function setAgentModelConfig(
    agentId: string,
    config: Partial<ModelConfig> & { provider?: ModelProvider },
): Promise<void> {
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { config: true },
    });

    const current = (agent?.config as Record<string, unknown>) ?? {};

    // Build the per-provider apiKeys map
    const existingKeys = (current.apiKeys as Record<string, string>) ?? {};
    const updatedKeys = { ...existingKeys };
    if (config.apiKey !== undefined && config.provider) {
        if (config.apiKey) {
            updatedKeys[config.provider] = config.apiKey;     // save for this provider
        } else {
            delete updatedKeys[config.provider];              // clear if empty string passed
        }
    }

    // Merge everything, strip the legacy apiKey field to avoid double-storing
    const { apiKey: _omit, ...restConfig } = config as Record<string, unknown>;
    void _omit; // suppress unused-var lint

    const updated = {
        ...current,
        ...restConfig,
        apiKeys: updatedKeys,
        apiKey: undefined,  // clear legacy slot
    };

    await prisma.agent.update({
        where: { id: agentId },
        data: { config: updated },
    });
}

/** Get ModelConfigs for all agents at once (for the dashboard, no keys). */
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
