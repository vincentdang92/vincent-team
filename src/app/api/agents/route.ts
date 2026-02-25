/**
 * GET /api/agents — List all agents with their persisted model configs.
 * Auto-seeds the 6 fixed agents into the DB if not yet present.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Prisma AgentType enum values — must match schema.prisma
const FIXED_AGENTS: { name: string; type: Prisma.AgentCreateInput['type'] }[] = [
    { name: 'orchestrator', type: 'ORCHESTRATOR' },
    { name: 'devops', type: 'DEVOPS' },
    { name: 'backend', type: 'BACKEND' },
    { name: 'qa', type: 'QA' },
    { name: 'ux', type: 'FRONTEND' },  // UX maps to FRONTEND enum
    { name: 'security', type: 'SECURITY' },
];

export async function GET() {
    try {
        // Upsert all fixed agents by name (name is @unique in schema)
        await Promise.all(
            FIXED_AGENTS.map(agent =>
                prisma.agent.upsert({
                    where: { name: agent.name },
                    create: {
                        name: agent.name,
                        type: agent.type,
                        status: 'IDLE',
                        config: Prisma.JsonNull,
                    },
                    update: {}, // never overwrite existing config
                })
            )
        );

        // Fetch all agents with their configs
        const agents = await prisma.agent.findMany({
            select: {
                id: true,
                name: true,
                type: true,
                status: true,
                config: true,
            },
        });

        // Mask the apiKey before sending to client
        const sanitized = agents.map(a => {
            const cfg = (a.config as Record<string, unknown> | null) ?? {};
            const provider = (cfg.provider as string) ?? null;

            // Per-provider key map (new format)
            const apiKeys = (cfg.apiKeys as Record<string, string> | undefined) ?? {};
            // Legacy single key fallback (old rows)
            const legacyKey = (cfg.apiKey as string | undefined);

            // Resolve key for the currently-configured provider
            const rawKey: string | undefined =
                (provider && apiKeys[provider]) ? apiKeys[provider]
                    : (legacyKey && (!provider || cfg.provider === provider)) ? legacyKey
                        : undefined;

            const keyHint = rawKey && rawKey.length >= 8
                ? `${rawKey.slice(0, 4)}••••••••${rawKey.slice(-4)}`
                : rawKey ? '••••••••' : null;

            // Build a summary of which providers have keys (safe — no raw values)
            const savedProviders = Object.keys(apiKeys).filter(k => !!apiKeys[k]);
            if (legacyKey && provider && !savedProviders.includes(provider)) {
                savedProviders.push(provider);   // include legacy in the list
            }

            return {
                id: a.id,
                name: a.name,
                type: a.type,
                status: a.status,
                config: {
                    provider: provider ?? null,
                    model: cfg.model ?? null,
                    temperature: cfg.temperature ?? null,
                    hasApiKey: !!rawKey,
                    keyHint,
                    savedProviders,   // e.g. ["GEMINI", "CLAUDE"] — lets UI show ✓ per provider
                },
            };
        });

        return NextResponse.json({ agents: sanitized });
    } catch (err) {
        console.error('[/api/agents GET]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
