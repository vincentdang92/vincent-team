/**
 * QA Senior Agent — dynamic system prompt from project stack.
 */

import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AgentType } from '@prisma/client';
import { BaseAgent, AgentTool } from '@/agents/base.agent';
import { StackConfig } from '@/lib/stack-library';
import { buildAgentPrompt } from '@/lib/prompt-builder';

const execAsync = promisify(exec);

// ── Tools ────────────────────────────────────────────────────────────────────
const fileWriteTool: AgentTool = {
    name: 'file-write',
    description: 'Write a test file. Args: { filePath: string, content: string }',
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
    description: 'Read source code to review for bugs. Args: { filePath: string }',
    async execute(args: Record<string, unknown>) {
        const { filePath } = args as { filePath: string };
        return fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8');
    },
};

const testRunnerTool: AgentTool = {
    name: 'run-tests',
    description: 'Run tests using vitest or playwright. Args: { testFile?: string, runner: "vitest"|"playwright" }',
    async execute(args: Record<string, unknown>) {
        const { testFile, runner } = args as { testFile?: string; runner: 'vitest' | 'playwright' };
        const cmd = runner === 'playwright'
            ? `npx playwright test ${testFile ?? ''}`
            : `npx vitest run ${testFile ?? ''}`;
        try {
            const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd() });
            return stdout || stderr;
        } catch (err) {
            return (err as Error).message;
        }
    },
};

// ── QA Agent ──────────────────────────────────────────────────────────────────
export class QAAgent extends BaseAgent {
    readonly roleName = 'qa';
    private projectStack: StackConfig;

    constructor(stack: StackConfig = {}) {
        super();
        this.projectStack = stack;
        this.tools = [fileWriteTool, fileReadTool, testRunnerTool];
    }

    async getSystemPrompt(): Promise<string> {
        return buildAgentPrompt('qa', this.projectStack, `
- Write tests before running them (write-then-run pattern)
- Always use the file-write tool to create test files first
- Use run-tests tool to verify tests pass
- Report precise failures with file:line references`);
    }

    getAgentType(): AgentType { return AgentType.QA; }
    getCapabilities(): string[] {
        return ['testing', 'bug-report', 'coverage', 'file-write', 'run-tests'];
    }
}
