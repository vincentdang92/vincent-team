/**
 * PATCH /api/memories/[id]  — promote SHORT_TERM → LESSON
 * DELETE /api/memories/[id] — forget (delete) a memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    try {
        const updated = await prisma.agentMemory.update({
            where: { id },
            data: {
                ...(body.memoryType ? { memoryType: body.memoryType } : {}),
                ...(body.importance !== undefined ? { importance: body.importance } : {}),
                ...(body.content ? { content: body.content } : {}),
            },
        });
        return NextResponse.json({ memory: updated });
    } catch (err) {
        return NextResponse.json(
            { error: 'Failed to update memory', detail: String(err) },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.agentMemory.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json(
            { error: 'Failed to delete memory', detail: String(err) },
            { status: 500 }
        );
    }
}
