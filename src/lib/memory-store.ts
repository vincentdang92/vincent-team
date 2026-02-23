/**
 * memory-store.ts
 * ─────────────────────────────────────────────────────────────
 * Low-level CRUD helpers for AgentMemory and ProjectSummary.
 * No AI calls — pure DB reads/writes.
 */

import { prisma } from '@/lib/prisma';
import { MemoryType } from '@prisma/client';

export interface LoadedMemory {
    id: string;
    agentRole: string;
    content: string;
    memoryType: MemoryType;
    importance: number;
    createdAt: Date;
}

// ── Short-term memory cap per agent ─────────────────────────────────────────
const MAX_SHORT_TERM = 30;

// ── Read ─────────────────────────────────────────────────────────────────────

/**
 * Get the N most recent memories for an agent role,
 * optionally scoped to a project.
 */
export async function getRecentMemories(
    agentRole: string,
    projectId?: string | null,
    limit = 5
): Promise<LoadedMemory[]> {
    try {
        return await prisma.agentMemory.findMany({
            where: {
                agentRole,
                ...(projectId ? { projectId } : {}),
                memoryType: MemoryType.SHORT_TERM,
            },
            orderBy: [
                { importance: 'desc' },
                { createdAt: 'desc' },
            ],
            take: limit,
            select: {
                id: true,
                agentRole: true,
                content: true,
                memoryType: true,
                importance: true,
                createdAt: true,
            },
        });
    } catch {
        return [];
    }
}

/**
 * Get all LESSON-type memories for an agent (permanent learnings).
 */
export async function getLessons(
    agentRole: string,
    projectId?: string | null
): Promise<LoadedMemory[]> {
    try {
        return await prisma.agentMemory.findMany({
            where: {
                agentRole,
                memoryType: MemoryType.LESSON,
                ...(projectId ? { projectId } : {}),
            },
            orderBy: { importance: 'desc' },
            select: {
                id: true,
                agentRole: true,
                content: true,
                memoryType: true,
                importance: true,
                createdAt: true,
            },
        });
    } catch {
        return [];
    }
}

/**
 * Get the rolling project summary (or null if none yet).
 */
export async function getProjectSummary(
    projectId: string
): Promise<string | null> {
    try {
        const summary = await prisma.projectSummary.findUnique({
            where: { projectId },
            select: { content: true },
        });
        return summary?.content ?? null;
    } catch {
        return null;
    }
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Save a new memory entry for an agent.
 * Automatically rotates old SHORT_TERM entries if over the cap.
 */
export async function saveMemory(opts: {
    agentRole: string;
    content: string;
    projectId?: string | null;
    taskId?: string | null;
    memoryType?: MemoryType;
    importance?: number;
}): Promise<void> {
    try {
        const type = opts.memoryType ?? MemoryType.SHORT_TERM;

        await prisma.agentMemory.create({
            data: {
                agentRole: opts.agentRole,
                content: opts.content,
                projectId: opts.projectId ?? null,
                taskId: opts.taskId ?? null,
                memoryType: type,
                importance: opts.importance ?? 0,
            },
        });

        // Rotate: keep only last MAX_SHORT_TERM per agent per project
        if (type === MemoryType.SHORT_TERM) {
            await rotateShortTermMemories(opts.agentRole, opts.projectId ?? null);
        }
    } catch {
        // Memory save failure should never crash an agent task
    }
}

/**
 * Promote a SHORT_TERM memory to a permanent LESSON.
 */
export async function promoteToLesson(
    memoryId: string,
    importance = 100
): Promise<void> {
    await prisma.agentMemory.update({
        where: { id: memoryId },
        data: { memoryType: MemoryType.LESSON, importance },
    });
}

/**
 * Create or update the rolling ProjectSummary.
 */
export async function upsertProjectSummary(
    projectId: string,
    content: string,
    taskCount: number
): Promise<void> {
    try {
        await prisma.projectSummary.upsert({
            where: { projectId },
            create: { projectId, content, taskCount },
            update: { content, taskCount },
        });
    } catch {
        // Ignore in test/dev environments without DB
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function forgetMemory(id: string): Promise<void> {
    await prisma.agentMemory.delete({ where: { id } });
}

export async function forgetAllMemories(
    agentRole: string,
    projectId?: string | null
): Promise<void> {
    await prisma.agentMemory.deleteMany({
        where: {
            agentRole,
            ...(projectId ? { projectId } : {}),
        },
    });
}

// ── Formatting ────────────────────────────────────────────────────────────────

/**
 * Formats memories + project summary into a prompt-ready block.
 * Returns empty string if there's nothing to inject.
 */
export function formatMemoryBlock(
    memories: LoadedMemory[],
    projectSummary: string | null,
    lessons: LoadedMemory[] = []
): string {
    if (!memories.length && !projectSummary && !lessons.length) return '';

    const parts: string[] = ['## 🧠 What I Remember'];

    if (projectSummary) {
        parts.push(`**Project Context:**\n${projectSummary}`);
    }

    if (lessons.length > 0) {
        parts.push('**Permanent Lessons:**');
        lessons.forEach(l => parts.push(`- ${l.content}`));
    }

    if (memories.length > 0) {
        parts.push('**Recent Work (newest first):**');
        memories.forEach(m => {
            const age = formatAge(m.createdAt);
            parts.push(`- [${age}] ${m.content}`);
        });
    }

    parts.push('---');
    return parts.join('\n');
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function rotateShortTermMemories(
    agentRole: string,
    projectId: string | null
): Promise<void> {
    try {
        const all = await prisma.agentMemory.findMany({
            where: { agentRole, projectId, memoryType: MemoryType.SHORT_TERM },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });

        if (all.length > MAX_SHORT_TERM) {
            const idsToDelete = all.slice(MAX_SHORT_TERM).map(m => m.id);
            await prisma.agentMemory.deleteMany({ where: { id: { in: idsToDelete } } });
        }
    } catch {
        // Non-critical
    }
}

function formatAge(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}
