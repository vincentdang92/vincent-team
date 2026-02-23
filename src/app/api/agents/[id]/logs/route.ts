import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/agents/:id/logs
 * Get agent logs
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const type = searchParams.get('type');

        const where: Record<string, unknown> = {
            agentId: id,
        };

        if (type) {
            where.type = type;
        }

        const logs = await prisma.agentLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: {
                agent: {
                    select: {
                        name: true,
                        type: true,
                    },
                },
            },
        });

        return NextResponse.json(logs);
    } catch (error) {
        console.error('Agent Logs API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent logs' },
            { status: 500 }
        );
    }
}
