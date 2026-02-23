/**
 * PATCH  /api/skills/[id] — Toggle active or update skill
 * DELETE /api/skills/[id] — Delete a skill
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
    agentRole: z.string().optional(),
    content: z.string().min(10).optional(),
    isActive: z.boolean().optional(),
    priority: z.number().int().min(0).max(100).optional(),
    sourceUrl: z.string().url().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const body = await req.json();
        const parsed = updateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const skill = await prisma.agentSkill.update({
            where: { id },
            data: parsed.data,
        });

        return NextResponse.json({ skill });
    } catch (err) {
        console.error('[PATCH /api/skills/[id]]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        await prisma.agentSkill.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[DELETE /api/skills/[id]]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
