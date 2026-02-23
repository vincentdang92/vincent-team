/**
 * GET    /api/projects/[id] — Get project detail
 * PATCH  /api/projects/[id] — Update stack config
 * DELETE /api/projects/[id] — Delete project
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProjectConfig, updateProjectStack, deleteProject } from '@/lib/project-config';

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    stack: z.object({
        frontend: z.string().optional(),
        backend: z.string().optional(),
        database: z.string().optional(),
        testing: z.string().optional(),
        deploy: z.string().optional(),
    }).optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const project = await getProjectConfig(id);
        if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ project });
    } catch (err) {
        console.error('[GET /api/projects/[id]]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

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

        const project = await updateProjectStack(id, parsed.data.stack ?? {});
        if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json({ project });
    } catch (err) {
        console.error('[PATCH /api/projects/[id]]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        await deleteProject(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[DELETE /api/projects/[id]]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
