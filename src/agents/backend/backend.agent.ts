/**
 * Backend Senior Agent — dynamic system prompt from project stack.
 */

import path from 'path';
import fs from 'fs/promises';
import { AgentType } from '@prisma/client';
import { BaseAgent, AgentTool } from '@/agents/base.agent';
import { StackConfig } from '@/lib/stack-library';
import { buildAgentPrompt } from '@/lib/prompt-builder';

// ── File Tools ────────────────────────────────────────────────────────────────
const fileWriteTool: AgentTool = {
    name: 'file-write',
    description: 'Write content to a file. Args: { filePath: string, content: string }',
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
    description: 'Read content of a file. Args: { filePath: string }',
    async execute(args: Record<string, unknown>) {
        const { filePath } = args as { filePath: string };
        const resolved = path.resolve(process.cwd(), filePath);
        return fs.readFile(resolved, 'utf-8');
    },
};

// ── Backend Agent ─────────────────────────────────────────────────────────────
export class BackendAgent extends BaseAgent {
    readonly roleName = 'backend';
    private projectStack: StackConfig;

    constructor(stack: StackConfig = {}) {
        super();
        this.projectStack = stack;
        this.tools = [fileWriteTool, fileReadTool];
    }

    async getSystemPrompt(): Promise<string> {
        return buildAgentPrompt('backend', this.projectStack, `
- File paths should be relative to project root
- Use the file-write tool to create/update source files
- Use the file-read tool to inspect existing code before modifying`);
    }

    getAgentType(): AgentType { return AgentType.BACKEND; }
    getCapabilities(): string[] {
        return ['api', 'database', 'validation', 'auth', 'file-write'];
    }
}
