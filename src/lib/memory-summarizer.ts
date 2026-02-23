/**
 * memory-summarizer.ts
 * ─────────────────────────────────────────────────────────────
 * Uses the cheapest available AI model to compress a completed
 * task into a 1-2 sentence memory, and to refresh the rolling
 * ProjectSummary after every N tasks.
 */

import { callModel, ChatMessage, ModelProvider } from '@/lib/model-router';
import { upsertProjectSummary } from '@/lib/memory-store';

// Use cheapest model by default — this runs after every task
const SUMMARY_MODEL_CONFIG = {
    provider: (process.env.MEMORY_SUMMARIZER_MODEL as ModelProvider | undefined)
        ?? ModelProvider.DEEPSEEK,
};

// Refresh project summary every N completed tasks
const PROJECT_SUMMARY_REFRESH_INTERVAL = 5;

// ── Task → Memory ─────────────────────────────────────────────────────────────

/**
 * Compress a completed task into a concise memory string.
 * Returns a 1-2 sentence plain-text summary suitable for storing in AgentMemory.
 */
export async function summarizeTaskResult(opts: {
    userRequest: string;
    taskSummary: string;
    results: string[];
    agentRole: string;
}): Promise<string> {
    const { userRequest, taskSummary, results, agentRole } = opts;

    // Truncate results to avoid giant context
    const resultSnippet = results
        .slice(0, 5)
        .map(r => r.slice(0, 300))
        .join('\n');

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: `You compress agent task results into a single concise memory sentence (max 120 chars).
Write in past tense. Include: what was done, key outcome, any important detail.
Example: "Created /users POST endpoint with Zod validation and bcrypt password hashing."
Respond with ONLY the memory sentence — no preamble, no quotes.`,
        },
        {
            role: 'user',
            content: `Agent role: ${agentRole}
User request: ${userRequest}
Task summary: ${taskSummary}
Results:
${resultSnippet}`,
        },
    ];

    try {
        const response = await callModel(SUMMARY_MODEL_CONFIG, messages);
        return response.content.trim().slice(0, 200);
    } catch {
        // Fallback: just use the task summary
        return taskSummary.slice(0, 200);
    }
}

// ── Project Summary Refresh ───────────────────────────────────────────────────

/**
 * Refresh the rolling ProjectSummary using recent memories.
 * Only runs every PROJECT_SUMMARY_REFRESH_INTERVAL tasks to save tokens.
 */
export async function maybeRefreshProjectSummary(opts: {
    projectId: string;
    taskCount: number;
    recentMemories: string[]; // last N memory content strings
    currentSummary: string | null;
}): Promise<void> {
    const { projectId, taskCount, recentMemories, currentSummary } = opts;

    // Only refresh every N tasks
    if (taskCount % PROJECT_SUMMARY_REFRESH_INTERVAL !== 0) return;
    if (recentMemories.length === 0) return;

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: `You maintain a rolling project context summary for an AI dev team.
Merge the existing summary with new recent work into 3-5 concise sentences.
Focus on: tech stack used, patterns established, recent changes, known issues.
Respond with ONLY the updated summary — no preamble.`,
        },
        {
            role: 'user',
            content: `Existing summary:
${currentSummary ?? '(none yet)'}

Recent task memories (newest first):
${recentMemories.slice(0, 10).map((m, i) => `${i + 1}. ${m}`).join('\n')}`,
        },
    ];

    try {
        const response = await callModel(SUMMARY_MODEL_CONFIG, messages);
        const newSummary = response.content.trim();
        await upsertProjectSummary(projectId, newSummary, taskCount);
    } catch {
        // Non-critical — project summary refresh failure shouldn't break anything
    }
}
