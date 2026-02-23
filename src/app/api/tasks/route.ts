/**
 * POST /api/tasks — Submit a task to the Orchestrator.
 * GET  /api/tasks — List recent tasks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrchestrator } from '@/agents/orchestrator/orchestrator.agent';
import { z } from 'zod';

const taskSchema = z.object({
    userRequest: z.string().min(1).max(2000),
    vpsId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = taskSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const { userRequest, vpsId, metadata } = parsed.data;

        // Create task record in DB
        const task = await prisma.task.create({
            data: {
                userRequest,
                status: 'PENDING',
            },
        });

        // Run orchestrator async (don't await — client listens via Socket.io)
        const orchestrator = getOrchestrator();
        orchestrator
            .dispatch({
                taskId: task.id,
                userRequest,
                vpsId,
                metadata,
            })
            .then(async ({ assignedRole, plan, results }: {
                assignedRole: string;
                plan: { taskSummary: string };
                results: string[];
            }) => {
                await prisma.task.update({
                    where: { id: task.id },
                    data: {
                        status: 'SUCCESS',
                        assignedRole,
                        summary: plan.taskSummary,
                        results,
                        completedAt: new Date(),
                    },
                });
            })
            .catch(async (err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                await prisma.task.update({
                    where: { id: task.id },
                    data: {
                        status: 'FAILED',
                        results: [`Error: ${msg}`],
                        completedAt: new Date(),
                    },
                });
            });

        return NextResponse.json({ taskId: task.id, status: 'PENDING' }, { status: 202 });
    } catch (err) {
        console.error('[/api/tasks POST]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') ?? '20', 10);

        const tasks = await prisma.task.findMany({
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit, 100),
        });

        return NextResponse.json({ tasks });
    } catch (err) {
        console.error('[/api/tasks GET]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
