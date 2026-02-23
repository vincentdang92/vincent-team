/**
 * Orchestrator Agent — Routes tasks to the correct role agent.
 * Now stack-aware: passes project's StackConfig to each role agent.
 */

import { AgentType } from '@prisma/client';
import { BaseAgent, AgentPlan, TaskContext } from '@/agents/base.agent';
import { DevOpsAgent } from '@/agents/devops/devops.agent';
import { BackendAgent } from '@/agents/backend/backend.agent';
import { QAAgent } from '@/agents/qa/qa.agent';
import { UXAgent } from '@/agents/ux/ux.agent';
import { StackConfig } from '@/lib/stack-library';
import { buildAgentPrompt } from '@/lib/prompt-builder';
import { getProjectConfig } from '@/lib/project-config';

// ── Role classification keywords ──────────────────────────────────────────────
const ROLE_KEYWORDS: Record<string, string[]> = {
    devops: ['deploy', 'server', 'vps', 'ssh', 'docker', 'nginx', 'systemd', 'disk', 'cpu',
        'memory', 'infra', 'ci/cd', 'pipeline', 'scale', 'container', 'kubernetes'],
    backend: ['api', 'route', 'database', 'schema', 'endpoint', 'auth', 'backend',
        'server-side', 'migration', 'query', 'model', 'crud', 'rest', 'graphql'],
    qa: ['test', 'bug', 'quality', 'coverage', 'playwright', 'vitest', 'jest', 'pytest',
        'spec', 'assertion', 'review code', 'security audit', 'lint', 'e2e'],
    ux: ['ui', 'component', 'design', 'css', 'tailwind', 'animation', 'accessibility',
        'a11y', 'layout', 'frontend', 'ux', 'form', 'button', 'page', 'view', 'screen'],
};

// ── Extended context for stack-aware dispatch ─────────────────────────────────
export interface OrchestratorContext extends TaskContext {
    projectId?: string;
    stack?: StackConfig; // can be supplied directly or loaded via projectId
}

export class OrchestratorAgent extends BaseAgent {
    readonly roleName = 'orchestrator';

    async getSystemPrompt(): Promise<string> {
        return buildAgentPrompt('orchestrator', {}, `
Routing guidelines:
- devops: server management, deployments, Docker, SSH, CI/CD, infra
- backend: API design, database models, auth, business logic, CRUD
- qa: testing, bug reports, code review, coverage analysis
- ux: UI components, design, styling, accessibility, animations

Always route to the most specific role. When in doubt, prefer backend.`);
    }

    getAgentType(): AgentType { return AgentType.ORCHESTRATOR; }
    getCapabilities(): string[] {
        return ['routing', 'task-splitting', 'coordination', 'planning'];
    }

    /** Classify which agent role should handle a task */
    classifyTask(userRequest: string): string {
        const lower = userRequest.toLowerCase();
        const scores: Record<string, number> = { devops: 0, backend: 0, qa: 0, ux: 0 };

        for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
            for (const kw of keywords) {
                if (lower.includes(kw)) scores[role]++;
            }
        }

        const best = (Object.entries(scores) as [string, number][])
            .sort(([, a], [, b]) => b - a)[0];

        return best[1] > 0 ? best[0] : 'backend';
    }

    /** Build a fresh role agent with the project's stack injected */
    private buildRoleAgent(role: string, stack: StackConfig): BaseAgent {
        switch (role) {
            case 'devops': return new DevOpsAgent(stack);
            case 'backend': return new BackendAgent(stack);
            case 'qa': return new QAAgent(stack);
            case 'ux': return new UXAgent(stack);
            default: return new BackendAgent(stack);
        }
    }

    /** Dispatch a task to the correct agent, injecting project stack context */
    async dispatch(context: OrchestratorContext): Promise<{
        assignedRole: string;
        plan: AgentPlan;
        results: string[];
    }> {
        if (!this.agentId) await this.initialize();

        // Resolve stack from projectId or use directly supplied stack
        let stack: StackConfig = context.stack ?? {};
        if (context.projectId && !context.stack) {
            const project = await getProjectConfig(context.projectId);
            if (project) {
                stack = project.stack;
                await this.log('INFO' as never, `📦 Project: "${project.name}" — Stack: ${[project.stack.frontend, project.stack.backend, project.stack.database]
                    .filter(Boolean).join(' + ')
                    }`);
            }
        }

        // Classify + build stack-aware agent
        const role = this.classifyTask(context.userRequest);
        const agent = this.buildRoleAgent(role, stack);

        await this.log('INFO' as never, `🎯 Routing to [${role.toUpperCase()}] agent`);

        await agent.initialize();
        const { plan, results } = await agent.run(context);

        await this.log('SUCCESS' as never, `✅ Task complete — ${results.length} action(s) taken`);

        return { assignedRole: role, plan, results };
    }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
let _orchestrator: OrchestratorAgent | null = null;

export function getOrchestrator(): OrchestratorAgent {
    if (!_orchestrator) _orchestrator = new OrchestratorAgent();
    return _orchestrator;
}
