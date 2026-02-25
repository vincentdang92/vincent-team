/**
 * GET  /api/skills        — List all skills (filter by agentRole query param)
 * POST /api/skills        — Create a new skill
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const createSkillSchema = z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    agentRole: z.string().default('all'),
    content: z.string().min(10),
    sourceUrl: z.string().url().optional(),
    sourceAuthor: z.string().max(100).optional(),
    priority: z.number().int().min(0).max(100).default(0),
    // Stack-aware triggers: { frontend?: 'bootstrap', deploy?: 'netlify', ... }
    stackTriggers: z.record(z.string(), z.string()).optional().nullable(),
});

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const role = searchParams.get('agentRole');

        const skills = await prisma.agentSkill.findMany({
            where: role ? { agentRole: { in: [role, 'all'] } } : undefined,
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });

        return NextResponse.json({ skills });
    } catch (err) {
        console.error('[GET /api/skills]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = createSkillSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { stackTriggers, ...rest } = parsed.data;
        const skill = await prisma.agentSkill.create({
            data: {
                ...rest,
                // Prisma requires Prisma.JsonNull (not JS null) for nullable JSON fields
                stackTriggers: stackTriggers === null ? Prisma.JsonNull : stackTriggers,
            },
        });
        return NextResponse.json({ skill }, { status: 201 });
    } catch (err) {
        console.error('[POST /api/skills]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
