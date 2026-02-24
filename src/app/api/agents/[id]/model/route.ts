/**
 * PATCH /api/agents/[id]/model — Switch the LLM model for a specific agent at runtime.
 * GET  /api/agents/[id]/model — Get current model config for an agent.
 * [id] here is the agent NAME (e.g. "devops", "qa"), not the DB UUID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ModelProvider } from '@/lib/model-router';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const modelSwitchSchema = z.object({
    provider: z.nativeEnum(ModelProvider),
    model: z.string().optional(),
    apiKey: z.string().optional(),
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().int().min(100).max(128000).optional(),
});

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const agent = await prisma.agent.findUnique({
            where: { name: id },
            select: { id: true, name: true, config: true },
        });
        if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

        const cfg = (agent.config as Record<string, unknown> | null) ?? {};
        return NextResponse.json({
            agentId: agent.name,
            config: {
                provider: cfg.provider ?? null,
                model: cfg.model ?? null,
                temperature: cfg.temperature ?? null,
                hasApiKey: !!cfg.apiKey,
            },
        });
    } catch {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // [id] = agent name (e.g. "devops", "qa")
    const { id } = await params;
    try {
        const body = await req.json();
        const parsed = modelSwitchSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        // Get existing config (if row exists) and merge
        const existing = await prisma.agent.findUnique({
            where: { name: id },
            select: { config: true },
        });
        const currentCfg = (existing?.config as Record<string, unknown>) ?? {};

        const updatedCfg: Record<string, unknown> = {
            ...currentCfg,
            provider: parsed.data.provider,
        };
        if (parsed.data.model !== undefined) updatedCfg.model = parsed.data.model;
        if (parsed.data.apiKey !== undefined) updatedCfg.apiKey = parsed.data.apiKey;
        if (parsed.data.temperature !== undefined) updatedCfg.temperature = parsed.data.temperature;
        if (parsed.data.maxTokens !== undefined) updatedCfg.maxTokens = parsed.data.maxTokens;

        // Upsert by name — safe even if GET /api/agents hasn't run yet
        await prisma.agent.upsert({
            where: { name: id },
            create: {
                name: id,
                type: 'DEVOPS',           // fallback type; will be corrected by GET /api/agents seed
                status: 'IDLE',
                config: updatedCfg as Prisma.InputJsonValue,
            },
            update: {
                config: updatedCfg as Prisma.InputJsonValue,
            },
        });

        return NextResponse.json({
            message: `Agent "${id}" switched to ${parsed.data.provider} / ${parsed.data.model ?? 'default'}`,
            config: {
                provider: updatedCfg.provider,
                model: updatedCfg.model ?? null,
                hasApiKey: !!updatedCfg.apiKey,
            },
        });
    } catch (err) {
        console.error('[/api/agents/[id]/model PATCH]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
