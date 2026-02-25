/**
 * POST /api/skills/preview
 *
 * Builds the full system prompt for an agent+skill combination.
 * When promptOnly=true (default from UI): returns just the prompt — zero token cost.
 * When promptOnly=false: makes a real LLM call and returns the response too.
 *
 * Body: { skillId, agentRole, userRequest, projectId?, promptOnly? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildAgentPrompt } from '@/lib/prompt-builder';
import { StackConfig } from '@/lib/stack-library';
import { callModel, ModelProvider } from '@/lib/model-router';

const previewSchema = z.object({
    skillId: z.string().min(1),
    agentRole: z.string().min(1),
    userRequest: z.string().min(1).max(2000),
    projectId: z.string().optional(),
    // When true: only build + return the system prompt (free, no LLM call)
    promptOnly: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = previewSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { skillId, agentRole, userRequest, projectId, promptOnly } = parsed.data;

        // Load the skill being previewed
        const skill = await prisma.agentSkill.findUnique({ where: { id: skillId } });
        if (!skill) {
            return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
        }

        // Resolve the project stack (if projectId provided)
        let stack: StackConfig = {};
        if (projectId) {
            const project = await prisma.project.findUnique({ where: { id: projectId } });
            if (project?.stack) stack = project.stack as StackConfig;
        }

        // Build the full system prompt with the skill injected
        const basePrompt = await buildAgentPrompt(agentRole, stack);
        const skillBlock = [
            '',
            '## Custom Skills (User-Installed)',
            `### \ud83e\udde0 Skill: ${skill.name}${skill.sourceUrl ? ` (${skill.sourceUrl})` : ''}`,
            skill.content,
        ].join('\n\n');
        const fullPrompt = basePrompt + skillBlock;

        // ── Prompt-only mode: return immediately, no LLM call ──────────────────
        if (promptOnly) {
            return NextResponse.json({
                promptPreview: fullPrompt,
                promptChars: fullPrompt.length,
                skillChars: skillBlock.length,
                response: null,
                model: null,
                usage: null,
            });
        }

        // ── Real LLM call mode ─────────────────────────────────────────────────
        const agentRecord = await prisma.agent.findFirst({
            where: { name: agentRole },
            select: { config: true },
        }).catch(() => null);

        const config = agentRecord?.config as Record<string, unknown> | null;
        const provider = (config?.provider as ModelProvider) ?? ModelProvider.GEMINI;
        const model = (config?.model as string) ?? 'gemini-2.0-flash';
        const apiKey = (config?.apiKey as string) ?? undefined;

        const response = await callModel(
            { provider, model, apiKey, maxTokens: 2048, temperature: 0.4 },
            [
                { role: 'system', content: fullPrompt },
                { role: 'user', content: userRequest },
            ]
        );

        return NextResponse.json({
            promptPreview: fullPrompt,
            promptChars: fullPrompt.length,
            skillChars: skillBlock.length,
            response: response.content,
            provider: response.provider,
            model: response.model,
            usage: response.usage,
        });
    } catch (err) {
        console.error('[POST /api/skills/preview]', err);
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
