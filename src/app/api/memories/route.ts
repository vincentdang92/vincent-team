/**
 * GET /api/memories
 * List agent memories — filterable by agentRole, projectId, memoryType, limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const agentRole = searchParams.get('agentRole') ?? undefined;
    const projectId = searchParams.get('projectId') ?? undefined;
    const memoryType = searchParams.get('memoryType') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

    try {
        const [memories, projectSummary] = await Promise.all([
            prisma.agentMemory.findMany({
                where: {
                    ...(agentRole ? { agentRole } : {}),
                    ...(projectId ? { projectId } : {}),
                    ...(memoryType ? { memoryType: memoryType as 'SHORT_TERM' | 'LESSON' } : {}),
                },
                orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
                take: limit,
            }),
            projectId
                ? prisma.projectSummary.findUnique({ where: { projectId } })
                : null,
        ]);

        return NextResponse.json({ memories, projectSummary });
    } catch (err) {
        return NextResponse.json(
            { error: 'Failed to fetch memories', detail: String(err) },
            { status: 500 }
        );
    }
}
