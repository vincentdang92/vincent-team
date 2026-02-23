/**
 * Prompt Builder — composes dynamic system prompts from a project's stack config.
 *
 * Usage:
 *   const prompt = buildAgentPrompt('backend', project.stack);
 *   // → "You are a Senior Backend Engineer. This project uses Express.js + MongoDB..."
 */

import { StackConfig, StackCategory, STACK_LIBRARY } from './stack-library';
import { loadSkillsForRole, formatSkillsBlock } from './skill-loader';

// ── Agent role descriptors ─────────────────────────────────────────────────────
const ROLE_INTROS: Record<string, string> = {
    devops: `You are a Senior DevOps Engineer AI agent.
Your responsibilities: infrastructure, deployments, CI/CD, server management, container orchestration, monitoring, and security hardening.
You always assess risk before executing commands and prefer read-only inspection before mutations.`,

    backend: `You are a Senior Backend Engineer AI agent.
Your responsibilities: API design, data modeling, business logic, authentication, validation, and performance optimization.
You write production-quality, type-safe, well-documented code with clear error handling.`,

    qa: `You are a Senior QA Engineer AI agent.
Your responsibilities: test strategy, unit/integration/E2E test generation, bug reporting, coverage analysis, and regression prevention.
You write comprehensive tests that cover happy paths, error paths, and edge cases.`,

    ux: `You are a Senior UX/Frontend Engineer AI agent.
Your responsibilities: UI components, accessibility (WCAG AA), responsive design, animations, and design system consistency.
You write clean, reusable components that are accessible, performant, and visually polished.`,

    orchestrator: `You are an AI Orchestrator agent.
Your responsibilities: analysing user requests, classifying them by domain, decomposing complex tasks into sub-tasks, and coordinating role agents.
You think step-by-step, identify dependencies, and create clear execution plans.`,

    security: `You are a Security Guardian AI agent.
Your responsibilities: threat modelling, code security review, vulnerability scanning, risk scoring, and security policy enforcement.
You never allow high-risk operations without explicit justification and approval.`,
};

// ── Which stack categories each role cares about ──────────────────────────────
const ROLE_STACK_CATEGORIES: Record<string, StackCategory[]> = {
    devops: ['deploy', 'database'],
    backend: ['backend', 'database', 'testing'],
    qa: ['testing', 'frontend', 'backend', 'mobile'],
    ux: ['frontend', 'mobile', 'testing'],
    orchestrator: ['frontend', 'backend', 'database', 'testing', 'deploy', 'mobile'],
    security: ['backend', 'database', 'deploy'],
};

// ── Core builder ──────────────────────────────────────────────────────────────
/**
 * Build a complete system prompt for an agent role + project stack.
 *
 * @param role - Agent role key (devops | backend | qa | ux | orchestrator | security)
 * @param stack - The project's StackConfig
 * @param extra - Optional extra instructions appended at the end (agent-specific tools, rules)
 */
export async function buildAgentPrompt(
    role: string,
    stack: StackConfig = {},
    extra?: string
): Promise<string> {
    const intro = ROLE_INTROS[role] ?? `You are a senior AI engineer specializing in ${role}.`;
    const categories = ROLE_STACK_CATEGORIES[role] ?? (Object.keys(STACK_LIBRARY) as StackCategory[]);

    // Collect relevant stack snippets
    const stackSections: string[] = [];
    for (const category of categories) {
        const key = stack[category];
        if (key) {
            const choice = STACK_LIBRARY[category]?.[key];
            if (choice) {
                stackSections.push(`### ${choice.label}\n${choice.promptSnippet}`);
            }
        }
    }

    // Load custom / SkillsMP skills from DB
    const customSkills = await loadSkillsForRole(role);
    const skillsBlock = formatSkillsBlock(customSkills);

    // Build full prompt
    const parts: string[] = [
        intro,
        '',
        '## Tech Stack for This Project',
        stackSections.length > 0
            ? stackSections.join('\n\n')
            : '_No specific stack configured — use best practices for the most common production setup._',
        '',
        '## General Rules',
        '- Always reason through the task before taking action',
        '- Write production-quality code (typed, error-handled, documented)',
        '- If a task is ambiguous, state your assumption and proceed',
        '- Never introduce security vulnerabilities (SQL injection, XSS, secrets in code)',
        '- Output valid, runnable code — no pseudocode or placeholders',
    ];

    if (extra) {
        parts.push('', '## Agent-Specific Rules', extra);
    }

    if (skillsBlock) {
        parts.push(skillsBlock);
    }

    return parts.join('\n');
}

/**
 * Build a human-readable summary of the stack config for display in the UI.
 * e.g. "React+Vite · Express · MongoDB · Vitest · Docker+VPS"
 */
export function formatStackSummary(stack: StackConfig): string {
    const parts = [
        stack.mobile,
        stack.frontend,
        stack.backend,
        stack.database,
        stack.testing,
        stack.deploy,
    ].filter(Boolean);
    return parts.join(' · ') || 'No stack configured';
}

/**
 * Check if a stack config has the minimum viable fields (at least backend or frontend).
 */
export function isValidStack(stack: StackConfig): boolean {
    return !!(stack.frontend || stack.backend);
}
