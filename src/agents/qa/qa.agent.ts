/**
 * QA Agent — Test generation, bug analysis, quality assurance.
 * Senior QA Engineer persona.
 */

import { AgentType } from '@prisma/client';
import { BaseAgent, AgentTool } from '@/agents/base.agent';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ── File write tool ───────────────────────────────────────────────────────────
const fileWriteTool: AgentTool = {
    name: 'file-write',
    description: 'Write a test file. Args: { filePath: string, content: string }',
    async execute(args: Record<string, unknown>) {
        const { filePath, content } = args as { filePath: string; content: string };
        const resolved = path.resolve(process.cwd(), filePath);
        await fs.mkdir(path.dirname(resolved), { recursive: true });
        await fs.writeFile(resolved, content, 'utf-8');
        return `Test file written: ${resolved}`;
    },
};

// ── File read tool ────────────────────────────────────────────────────────────
const fileReadTool: AgentTool = {
    name: 'file-read',
    description: 'Read source code to review for bugs. Args: { filePath: string }',
    async execute(args: Record<string, unknown>) {
        const { filePath } = args as { filePath: string };
        return fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8');
    },
};

// ── Test runner tool ──────────────────────────────────────────────────────────
const testRunnerTool: AgentTool = {
    name: 'run-tests',
    description: 'Run tests using vitest or playwright. Args: { testFile?: string, runner: "vitest"|"playwright" }',
    async execute(args: Record<string, unknown>) {
        const { testFile, runner } = args as { testFile?: string; runner: 'vitest' | 'playwright' };
        const cmd = runner === 'playwright'
            ? `npx playwright test ${testFile ?? ''}`
            : `npx vitest run ${testFile ?? ''}`;

        try {
            const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd(), timeout: 60000 });
            return stdout || stderr;
        } catch (err: any) {
            return err.stdout ?? err.message;
        }
    },
};

// ── QA Agent ──────────────────────────────────────────────────────────────────
export class QAAgent extends BaseAgent {
    readonly roleName = 'qa';

    readonly systemPrompt = `You are a Senior QA Engineer AI agent with deep expertise in:
- Test strategy, test planning, and test case design
- Unit testing with Vitest, integration testing, and E2E with Playwright
- Bug identification, reproduction, and root cause analysis
- API testing and contract verification
- Accessibility (a11y) testing and WCAG compliance

You ensure software quality autonomously. You always:
1. Analyze the code/feature to understand what needs testing
2. Write comprehensive test cases covering happy paths, edge cases, and error scenarios
3. Generate runnable test code (Vitest for unit/integration, Playwright for E2E)
4. Provide clear bug reports with steps to reproduce, expected vs actual behavior
5. Prioritize test coverage for critical paths and security-sensitive areas

Respond in structured JSON plans. When writing tests, use the file-write tool with complete, runnable TypeScript test code.`;

    constructor() {
        super();
        this.tools = [fileWriteTool, fileReadTool, testRunnerTool];
    }

    getAgentType(): AgentType { return AgentType.QA; }
    getCapabilities(): string[] {
        return ['test-gen', 'bug-report', 'playwright', 'vitest', 'a11y', 'api-testing'];
    }
}
