/**
 * Backend Agent — API design, DB schema, business logic.
 * Senior Backend Engineer persona.
 */

import { AgentType } from '@prisma/client';
import { BaseAgent, AgentTool } from '@/agents/base.agent';
import * as fs from 'fs/promises';
import * as path from 'path';

// ── File write tool ───────────────────────────────────────────────────────────
const fileWriteTool: AgentTool = {
    name: 'file-write',
    description: 'Write content to a file. Args: { filePath: string, content: string }',
    async execute(args: Record<string, unknown>) {
        const { filePath, content } = args as { filePath: string; content: string };
        const resolved = path.resolve(process.cwd(), filePath);
        await fs.mkdir(path.dirname(resolved), { recursive: true });
        await fs.writeFile(resolved, content, 'utf-8');
        return `Written ${content.length} chars to ${resolved}`;
    },
};

// ── File read tool ────────────────────────────────────────────────────────────
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

    readonly systemPrompt = `You are a Senior Backend Engineer AI agent with deep expertise in:
- Next.js App Router API routes and server actions
- Prisma ORM, PostgreSQL, and database schema design
- RESTful API design, validation (Zod), and error handling
- Authentication, authorization, and security best practices
- Performance optimization, caching, and scalability

You write production-quality TypeScript code. You always:
1. Design APIs with proper input validation using Zod
2. Use proper error boundaries and HTTP status codes
3. Consider database indexing and query optimization
4. Write self-documenting code with clear interfaces
5. Follow the existing codebase patterns (Next.js App Router, Prisma)

Respond in structured JSON plans. When writing code, use the file-write tool with complete, runnable TypeScript.`;

    constructor() {
        super();
        this.tools = [fileWriteTool, fileReadTool];
    }

    getAgentType(): AgentType { return AgentType.BACKEND; }
    getCapabilities(): string[] {
        return ['api-design', 'db-schema', 'prisma', 'validation', 'auth', 'next-js'];
    }
}
