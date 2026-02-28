/**
 * UX Senior Agent — generates UI/HTML/CSS directly via a single LLM generation step.
 *
 * Design: NO tools and overrides reason() to produce a single-step plan.
 * This means BaseAgent.execute() runs exactly one no-tool generation call,
 * which asks the LLM to produce the full HTML/code deliverable at maxTokens:16384.
 * The result lands directly in Task.results[] and is downloadable from the dashboard.
 */

import { AgentType } from '@prisma/client';
import { BaseAgent, AgentPlan, TaskContext } from '@/agents/base.agent';
import { StackConfig } from '@/lib/stack-library';
import { buildAgentPrompt } from '@/lib/prompt-builder';

export class UXAgent extends BaseAgent {
    readonly roleName = 'ux';
    private projectStack: StackConfig;

    constructor(stack: StackConfig = {}) {
        super();
        this.projectStack = stack;
        // NO tools — forces the no-tool LLM generation path in BaseAgent.execute()
        this.tools = [];
    }

    /**
     * Override reason() to skip the planning LLM call entirely.
     * Returns a hardcoded single-step plan so execute() makes exactly ONE
     * LLM generation call with the full task as the prompt.
     */
    async reason(_context: TaskContext): Promise<AgentPlan> {
        await this.log('INFO' as never, '🎨 UX agent: skipping plan step → generating deliverable directly');
        return {
            taskSummary: _context.userRequest,
            riskLevel: 'LOW',
            requiresApproval: false,
            steps: [
                {
                    stepNumber: 1,
                    action: _context.userRequest,
                    reasoning: 'Generate the complete UI deliverable based on the user request.',
                    tool: undefined,
                },
            ],
        };
    }

    async getSystemPrompt(): Promise<string> {
        return buildAgentPrompt('ux', this.projectStack, `
OUTPUT FORMAT (MUST FOLLOW EXACTLY):
- Output ONLY raw file content — no preamble, no explanation, no markdown fences
- Single file → output the raw content starting from line 1 (e.g. <!DOCTYPE html>)
- Multiple files → use EXACTLY this delimiter format, one per file:
    === FILE: relative/path/filename.ext ===
    <full file content here>

QUALITY RULES:
- WCAG AA accessibility: aria-labels, keyboard nav, visible focus rings
- Semantic HTML5: <nav>, <main>, <section>, <article>, <button>
- Mobile-first responsive layout
- Subtle animations that respect prefers-reduced-motion
- Modern, vibrant design — NOT generic Bootstrap defaults
- ALL CSS must be inline (<style> tag) — output must be fully self-contained and runnable with no external dependencies except CDN links
- NEVER truncate — output every line of every file completely`);
    }

    getAgentType(): AgentType { return AgentType.FRONTEND; }
    getCapabilities(): string[] {
        return ['ui-components', 'html', 'css', 'styling', 'accessibility', 'animations'];
    }
}
