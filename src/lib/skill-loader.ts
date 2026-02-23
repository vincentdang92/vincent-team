/**
 * Skill Loader — fetches active AgentSkill records from the DB
 * and formats them for injection into agent system prompts.
 *
 * Called by prompt-builder at prompt-build time.
 */

import { prisma } from './prisma';

export interface LoadedSkill {
    id: string;
    name: string;
    content: string;
    sourceUrl?: string | null;
    priority: number;
}

/**
 * Load all active skills for a given agent role.
 * Returns skills tagged for that role OR tagged "all".
 * Ordered by priority desc (highest first).
 */
export async function loadSkillsForRole(agentRole: string): Promise<LoadedSkill[]> {
    try {
        const skills = await prisma.agentSkill.findMany({
            where: {
                isActive: true,
                agentRole: { in: [agentRole, 'all'] },
            },
            orderBy: { priority: 'desc' },
            select: { id: true, name: true, content: true, sourceUrl: true, priority: true },
        });
        return skills;
    } catch {
        // DB may not be available in dev/test — degrade gracefully
        return [];
    }
}

/**
 * Format loaded skills as a block to inject into a system prompt.
 */
export function formatSkillsBlock(skills: LoadedSkill[]): string {
    if (skills.length === 0) return '';

    const entries = skills.map(s => {
        const header = `### 🧠 Skill: ${s.name}${s.sourceUrl ? ` (${s.sourceUrl})` : ''}`;
        return `${header}\n${s.content}`;
    });

    return [
        '',
        '## Custom Skills (User-Installed)',
        ...entries,
    ].join('\n\n');
}
