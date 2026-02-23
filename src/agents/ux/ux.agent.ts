/**
 * UX Agent — UI design, component generation, accessibility review.
 * Senior UX Engineer persona.
 */

import { AgentType } from '@prisma/client';
import { BaseAgent, AgentTool } from '@/agents/base.agent';
import * as fs from 'fs/promises';
import * as path from 'path';

// ── File write tool ───────────────────────────────────────────────────────────
const fileWriteTool: AgentTool = {
    name: 'file-write',
    description: 'Write a React/TSX component or CSS file. Args: { filePath: string, content: string }',
    async execute(args: Record<string, unknown>) {
        const { filePath, content } = args as { filePath: string; content: string };
        const resolved = path.resolve(process.cwd(), filePath);
        await fs.mkdir(path.dirname(resolved), { recursive: true });
        await fs.writeFile(resolved, content, 'utf-8');
        return `Component written: ${resolved}`;
    },
};

// ── File read tool ────────────────────────────────────────────────────────────
const fileReadTool: AgentTool = {
    name: 'file-read',
    description: 'Read an existing component or design file to review. Args: { filePath: string }',
    async execute(args: Record<string, unknown>) {
        const { filePath } = args as { filePath: string };
        return fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8');
    },
};

// ── List directory tool ───────────────────────────────────────────────────────
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

// ── UX Agent ──────────────────────────────────────────────────────────────────
export class UXAgent extends BaseAgent {
    readonly roleName = 'ux';

    readonly systemPrompt = `You are a Senior UX Engineer AI agent with deep expertise in:
- React 19 and Next.js 16 component architecture
- Tailwind CSS 4, CSS animations, and modern design systems
- Accessibility (WCAG 2.1 AA), semantic HTML, and ARIA
- UX principles: information hierarchy, interaction design, micro-animations
- Design tokens, component libraries, and consistent visual language

You create stunning, production-quality UI components autonomously. You always:
1. Review the existing design system and Tailwind config before creating new components
2. Build components that are accessible, responsive, and follow existing patterns
3. Add meaningful micro-animations using Framer Motion (already installed)
4. Use semantic HTML with proper ARIA labels for accessibility
5. Follow the cyberpunk dark theme established in the current codebase (dark backgrounds, glow effects)

Respond in structured JSON plans. When writing components, use the file-write tool with complete, production-ready TSX code. Components must:
- Be TypeScript with proper prop interfaces
- Support dark mode (default theme is dark/cyberpunk)
- Be accessible (keyboard nav, screen reader friendly)
- Use Tailwind 4 classes and Framer Motion for animations`;

    constructor() {
        super();
        this.tools = [fileWriteTool, fileReadTool, listDirTool];
    }

    getAgentType(): AgentType { return AgentType.FRONTEND; }
    getCapabilities(): string[] {
        return ['ui-review', 'component-gen', 'accessibility', 'ux-spec', 'animation', 'tailwind'];
    }
}
