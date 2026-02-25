/**
 * Skill Loader — fetches active AgentSkill records from the DB
 * and formats them for injection into agent system prompts.
 *
 * Called by prompt-builder at prompt-build time.
 */

import { prisma } from './prisma';
import { StackConfig } from './stack-library';

export interface LoadedSkill {
    id: string;
    name: string;
    content: string;
    sourceUrl?: string | null;
    priority: number;
    stackTriggers?: Record<string, string> | null;
}

/**
 * Load all active skills for a given agent role.
 * Returns skills tagged for that role OR tagged "all".
 * Applies stack-aware filtering: if a skill has stackTriggers defined,
 * it is only included when at least one trigger key matches the project stack (OR logic).
 * Skills with no stackTriggers are always included.
 * Ordered by priority desc (highest first).
 */
export async function loadSkillsForRole(
    agentRole: string,
    stack?: StackConfig,
): Promise<LoadedSkill[]> {
    try {
        // Use `as unknown as LoadedSkill[]` to avoid Prisma stale-type errors
        // when the generated client is temporarily behind the schema (e.g. after
        // adding the stackTriggers column before running 'prisma generate').
        // At runtime Prisma will return all columns including the new JSON field.
        const skills = await prisma.agentSkill.findMany({
            where: {
                isActive: true,
                agentRole: { in: [agentRole, 'all'] },
            },
            orderBy: { priority: 'desc' },
        }) as unknown as LoadedSkill[];

        return skills.filter(skill => {
            const triggers = skill.stackTriggers as Record<string, string> | null | undefined;

            // No triggers = global skill, always active
            if (!triggers || Object.keys(triggers).length === 0) return true;

            // No stack context available = include global skills only (exclude stack-gated)
            if (!stack) return false;

            // OR logic: activate if any trigger key matches the project stack value
            return Object.entries(triggers).some(([key, value]) => {
                const stackVal = (stack as Record<string, string | undefined>)[key];
                return stackVal && stackVal.toLowerCase() === value.toLowerCase();
            });
        });
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
