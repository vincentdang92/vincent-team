/**
 * UX Senior Agent — dynamic system prompt from project stack.
 */

import path from 'path';
import fs from 'fs/promises';
import { AgentType } from '@prisma/client';
import { BaseAgent, AgentTool } from '@/agents/base.agent';
import { StackConfig } from '@/lib/stack-library';
import { buildAgentPrompt } from '@/lib/prompt-builder';

// ── Tools ────────────────────────────────────────────────────────────────────
const fileWriteTool: AgentTool = {
    name: 'file-write',
    description: 'Write a React/TSX component or CSS file. Args: { filePath: string, content: string }',
    async execute(args: Record<string, unknown>) {
        const { filePath, content } = args as { filePath: string; content: string };
        const resolved = path.resolve(process.cwd(), filePath);
        await fs.mkdir(path.dirname(resolved), { recursive: true });
        await fs.writeFile(resolved, content, 'utf-8');
        return `Written ${resolved}`;
    },
};

const fileReadTool: AgentTool = {
    name: 'file-read',
    description: 'Read an existing component or design file to review. Args: { filePath: string }',
    async execute(args: Record<string, unknown>) {
        const { filePath } = args as { filePath: string };
        return fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8');
    },
};

const listDirTool: AgentTool = {
    name: 'list-dir',
    description: 'List files in a directory to understand the codebase structure. Args: { dirPath: string }',
    async execute(args: Record<string, unknown>) {
        const { dirPath } = args as { dirPath: string };
        const resolved = path.resolve(process.cwd(), dirPath);
        const entries = await fs.readdir(resolved, { withFileTypes: true });
        return entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
    },
};

// ── UX Agent ─────────────────────────────────────────────────────────────────
export class UXAgent extends BaseAgent {
    readonly roleName = 'ux';
    private projectStack: StackConfig;

    constructor(stack: StackConfig = {}) {
        super();
        this.projectStack = stack;
        this.tools = [fileWriteTool, fileReadTool, listDirTool];
    }

    async getSystemPrompt(): Promise<string> {
        return buildAgentPrompt('ux', this.projectStack, `
- Always implement WCAG AA accessibility (aria-labels, keyboard nav, focus rings)
- Use semantic HTML5 elements (nav, main, section, article, button)
- Components must be responsive (mobile-first breakpoints)
- Use list-dir to understand existing component structure before writing new ones
- Animations should be subtle and respect prefers-reduced-motion`);
    }

    getAgentType(): AgentType { return AgentType.FRONTEND; }
    getCapabilities(): string[] {
        return ['ui-components', 'styling', 'accessibility', 'animations', 'file-write'];
    }
}
