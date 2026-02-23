/**
 * Orchestrator Agent — Routes tasks to the right role agent.
 * Brain of the multi-agent team.
 */

import { AgentType } from '@prisma/client';
import { BaseAgent, AgentPlan, TaskContext } from '@/agents/base.agent';
import { DevOpsAgent } from '@/agents/devops/devops.agent';
import { BackendAgent } from '@/agents/backend/backend.agent';
import { QAAgent } from '@/agents/qa/qa.agent';
import { UXAgent } from '@/agents/ux/ux.agent';

// Role classification keywords
const ROLE_KEYWORDS: Record<string, string[]> = {
    devops: ['deploy', 'server', 'vps', 'ssh', 'docker', 'nginx', 'systemd', 'disk', 'cpu', 'memory', 'infra', 'ci/cd', 'pipeline', 'scale'],
    backend: ['api', 'route', 'database', 'schema', 'prisma', 'endpoint', 'auth', 'backend', 'server-side', 'migration', 'query', 'model'],
    qa: ['test', 'bug', 'quality', 'coverage', 'playwright', 'vitest', 'spec', 'assertion', 'review code', 'security audit', 'lint'],
    ux: ['ui', 'component', 'design', 'css', 'tailwind', 'animation', 'accessibility', 'a11y', 'layout', 'frontend', 'figma', 'ux', 'form', 'button'],
};

export class OrchestratorAgent extends BaseAgent {
    readonly roleName = 'orchestrator';

    readonly systemPrompt = `You are an AI Team Orchestrator. Your job is to analyze user requests
and determine:
1. Which agent role should handle the task (devops/backend/qa/ux)
2. Whether the task should be split across multiple agents
3. The priority and risk level of the task

Agent roles:
- devops: Server management, deployments, Docker, SSH, CI/CD
- backend: API design, database, Prisma, business logic, auth
- qa: Testing, bug reports, code review, test generation
- ux: UI components, design, CSS, accessibility, animations

Respond in structured JSON plans as defined.`;

    // Map of instantiated role agents
    private readonly roleAgents: Record<string, BaseAgent> = {
        devops: new DevOpsAgent(),
        backend: new BackendAgent(),
        qa: new QAAgent(),
        ux: new UXAgent(),
    };

    getAgentType(): AgentType { return AgentType.ORCHESTRATOR; }
    getCapabilities(): string[] {
        return ['routing', 'task-splitting', 'coordination', 'planning'];
    }

    /** Classify which agent role should handle a task */
    classifyTask(userRequest: string): string {
        const lowerReq = userRequest.toLowerCase();
        const scores: Record<string, number> = { devops: 0, backend: 0, qa: 0, ux: 0 };

        for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
            for (const kw of keywords) {
                if (lowerReq.includes(kw)) scores[role]++;
            }
        }

        // Pick the highest scoring role, default to backend
        const best = (Object.entries(scores) as [string, number][])
            .sort(([, a], [, b]) => b - a)[0];

        return best[1] > 0 ? best[0] : 'backend';
    }

    /** Dispatch a task directly to the correct agent */
    async dispatch(context: TaskContext): Promise<{
        assignedRole: string;
        plan: AgentPlan;
        results: string[];
    }> {
        if (!this.agentId) await this.initialize();

        // Classify first
        const role = this.classifyTask(context.userRequest);
        const agent = this.roleAgents[role];

        await this.log('INFO' as any, `🎯 Routing task to [${role.toUpperCase()}] agent`);

        // Ensure target agent is initialized
        await agent.initialize();

        // Run the target agent
        const { plan, results } = await agent.run(context);

        await this.log('SUCCESS' as any, `✅ Task dispatched to ${role} — ${results.length} results`);

        return { assignedRole: role, plan, results };
    }
}

// ── Singleton instance ────────────────────────────────────────────────────────
let _orchestrator: OrchestratorAgent | null = null;

export function getOrchestrator(): OrchestratorAgent {
    if (!_orchestrator) {
        _orchestrator = new OrchestratorAgent();
    }
    return _orchestrator;
}
