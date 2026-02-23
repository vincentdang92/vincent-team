/**
 * DELETE /api/memories/clear — bulk-delete memories by agentRole or projectId
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const agentRole = searchParams.get('agentRole') ?? undefined;
    const projectId = searchParams.get('projectId') ?? undefined;

    if (!agentRole && !projectId) {
        return NextResponse.json(
            { error: 'Provide agentRole or projectId query param' },
            { status: 400 }
        );
    }

    try {
        const { count } = await prisma.agentMemory.deleteMany({
            where: {
                ...(agentRole ? { agentRole } : {}),
                ...(projectId ? { projectId } : {}),
            },
        });
        return NextResponse.json({ success: true, deleted: count });
    } catch (err) {
        return NextResponse.json(
            { error: 'Failed to clear memories', detail: String(err) },
            { status: 500 }
        );
    }
}
