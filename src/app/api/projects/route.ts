/**
 * POST /api/projects — Create a project
 * GET  /api/projects — List all projects
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProject, listProjects } from '@/lib/project-config';

const createProjectSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    stack: z.object({
        frontend: z.string().optional(),
        backend: z.string().optional(),
        database: z.string().optional(),
        testing: z.string().optional(),
        deploy: z.string().optional(),
        mobile: z.string().optional(),   // ← keep in sync with StackConfig
    }).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = createProjectSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const project = await createProject(parsed.data);
        return NextResponse.json({ project }, { status: 201 });
    } catch (err) {
        console.error('[POST /api/projects]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const projects = await listProjects();
        return NextResponse.json({ projects });
    } catch (err) {
        console.error('[GET /api/projects]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
