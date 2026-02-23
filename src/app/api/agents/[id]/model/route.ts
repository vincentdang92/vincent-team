/**
 * PATCH /api/agents/[id]/model — Switch the LLM model for a specific agent at runtime.
 * GET  /api/agents/[id]/model — Get current model config for an agent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgentModelConfig, setAgentModelConfig } from '@/lib/model-config';
import { ModelProvider } from '@/lib/model-router';
import { z } from 'zod';

const modelSwitchSchema = z.object({
    provider: z.nativeEnum(ModelProvider),
    model: z.string().optional(),
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().int().min(100).max(128000).optional(),
});

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const config = await getAgentModelConfig(id);
        return NextResponse.json({ agentId: id, config });
    } catch (err) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        await setAgentModelConfig(id, parsed.data);
        const updated = await getAgentModelConfig(id);

        return NextResponse.json({
            message: `Agent ${id} model switched to ${parsed.data.provider}`,
            config: updated,
        });
    } catch (err) {
        console.error('[/api/agents/[id]/model PATCH]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
