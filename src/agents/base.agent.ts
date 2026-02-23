/**
 * BaseAgent — Abstract class shared by all AI role agents.
 * Each role agent (UX / BE / QA / DevOps) extends this class.
 */

import { prisma } from '@/lib/prisma';
import { callModel, ChatMessage, ModelConfig, ModelProvider } from '@/lib/model-router';
import { getAgentModelConfig } from '@/lib/model-config';
import { AgentStatus, LogType, LogLevel } from '@prisma/client';
import { emitAgentLog } from '@/lib/socket';

// ── Tool interface ─────────────────────────────────────────────────────────────
export interface AgentTool {
    name: string;
    description: string;
    execute(args: Record<string, unknown>): Promise<unknown>;
}

// ── Plan step ─────────────────────────────────────────────────────────────────
export interface PlanStep {
    stepNumber: number;
    action: string;       // description of what to do
    tool?: string;        // tool name to use (optional for pure reasoning steps)
    args?: Record<string, unknown>;
    reasoning: string;    // agent's thought for this step
}

export interface AgentPlan {
    taskSummary: string;
    steps: PlanStep[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiresApproval: boolean;
}

// ── Task context ──────────────────────────────────────────────────────────────
export interface TaskContext {
    taskId?: string;
    userRequest: string;
    vpsId?: string;
    metadata?: Record<string, unknown>;
}

// ── Base Agent ────────────────────────────────────────────────────────────────
export abstract class BaseAgent {
    /** DB id of this agent record */
    protected agentId!: string;

    /** Role name, e.g. "devops", "qa", "ux", "backend" */
    abstract readonly roleName: string;

    /** System prompt that defines this agent's persona and capabilities */
    abstract readonly systemPrompt: string;

    /** Tools this agent can use */
    protected tools: AgentTool[] = [];

    // ── Lifecycle ────────────────────────────────────────────────────────────────

    /** Load or create the agent DB record */
    async initialize(): Promise<void> {
        const existing = await prisma.agent.findUnique({
            where: { name: this.roleName },
        });

        if (existing) {
            this.agentId = existing.id;
        } else {
            const created = await prisma.agent.create({
                data: {
                    name: this.roleName,
                    type: this.getAgentType(),
                    capabilities: this.getCapabilities(),
                    status: AgentStatus.IDLE,
                },
            });
            this.agentId = created.id;
        }
    }

    abstract getAgentType(): import('@prisma/client').AgentType;
    abstract getCapabilities(): string[];

    // ── Core reasoning loop ───────────────────────────────────────────────────────

    /** Step 1: Think about the task — returns a structured plan */
    async reason(context: TaskContext): Promise<AgentPlan> {
        await this.setStatus(AgentStatus.THINKING);
        await this.log(LogType.REASONING, `🧠 Starting to reason about task: "${context.userRequest}"`);

        const modelConfig = await this.getModelConfig();

        const messages: ChatMessage[] = [
            { role: 'system', content: this.systemPrompt },
            {
                role: 'user',
                content: this.buildReasoningPrompt(context),
            },
        ];

        const response = await callModel(modelConfig, messages);
        await this.log(LogType.REASONING, `💭 Reasoning complete using ${response.provider}:${response.model}`, {
            usage: response.usage,
        });

        const plan = this.parsePlan(response.content);
        await this.log(LogType.INFO, `📋 Plan: ${plan.steps.length} steps, risk=${plan.riskLevel}`);

        return plan;
    }

    /** Step 2: Execute the plan step by step */
    async execute(plan: AgentPlan, context: TaskContext): Promise<string[]> {
        if (plan.requiresApproval && plan.riskLevel === 'CRITICAL') {
            await this.log(LogType.SECURITY, '🚨 CRITICAL risk plan requires human approval — halting');
            await this.setStatus(AgentStatus.WAITING);
            return ['BLOCKED: Critical risk requires human approval'];
        }

        await this.setStatus(AgentStatus.EXECUTING);
        const results: string[] = [];

        for (const step of plan.steps) {
            await this.log(LogType.EXECUTION, `▶️ Step ${step.stepNumber}: ${step.action}`);

            if (step.tool) {
                const tool = this.tools.find(t => t.name === step.tool);
                if (!tool) {
                    const err = `Tool "${step.tool}" not found`;
                    await this.log(LogType.ERROR, `❌ ${err}`);
                    results.push(`ERROR: ${err}`);
                    continue;
                }

                try {
                    const result = await tool.execute(step.args ?? {});
                    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                    await this.log(LogType.SUCCESS, `✅ Step ${step.stepNumber} done: ${resultStr.slice(0, 200)}`);
                    results.push(resultStr);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    await this.log(LogType.ERROR, `❌ Step ${step.stepNumber} failed: ${msg}`);
                    results.push(`ERROR: ${msg}`);
                }
            } else {
                // Pure reasoning / documentation step
                results.push(`[Reasoning] ${step.reasoning}`);
            }
        }

        await this.setStatus(AgentStatus.IDLE);
        await this.log(LogType.SUCCESS, `🎉 Task complete — ${results.length} steps executed`);
        return results;
    }

    /** High-level: reason then execute */
    async run(context: TaskContext): Promise<{ plan: AgentPlan; results: string[] }> {
        if (!this.agentId) await this.initialize();
        const plan = await this.reason(context);
        const results = await this.execute(plan, context);
        return { plan, results };
    }

    // ── Model config ──────────────────────────────────────────────────────────────
    async getModelConfig(): Promise<ModelConfig> {
        if (!this.agentId) return { provider: this.getDefaultProvider() };
        return getAgentModelConfig(this.agentId);
    }

    protected getDefaultProvider(): ModelProvider {
        return (process.env.ACTIVE_MODEL as ModelProvider) ?? ModelProvider.CLAUDE;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────
    private buildReasoningPrompt(context: TaskContext): string {
        return `
You are a ${this.roleName} agent. Analyze this task and produce a JSON plan.

**Task:** ${context.userRequest}
${context.vpsId ? `**Target VPS:** ${context.vpsId}` : ''}
${context.metadata ? `**Context:** ${JSON.stringify(context.metadata)}` : ''}

**Available Tools:** ${this.tools.map(t => `${t.name}: ${t.description}`).join('\n')}

Respond ONLY with valid JSON in this exact format:
{
  "taskSummary": "brief summary",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "requiresApproval": false,
  "steps": [
    {
      "stepNumber": 1,
      "action": "what to do",
      "tool": "tool-name or null",
      "args": {},
      "reasoning": "why"
    }
  ]
}
`.trim();
    }

    private parsePlan(responseContent: string): AgentPlan {
        try {
            // Strip markdown code fences if present
            const cleaned = responseContent
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/```\s*$/i, '')
                .trim();
            return JSON.parse(cleaned) as AgentPlan;
        } catch {
            // Fallback plan
            return {
                taskSummary: responseContent.slice(0, 200),
                steps: [{ stepNumber: 1, action: responseContent, reasoning: 'Raw response', tool: undefined }],
                riskLevel: 'LOW',
                requiresApproval: false,
            };
        }
    }

    protected async setStatus(status: AgentStatus): Promise<void> {
        if (!this.agentId) return;
        await prisma.agent.update({
            where: { id: this.agentId },
            data: { status, lastActiveAt: new Date() },
        });
    }

    protected async log(
        type: LogType,
        message: string,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        if (!this.agentId) return;

        const entry = await prisma.agentLog.create({
            data: {
                agentId: this.agentId,
                type,
                level: type === LogType.ERROR ? LogLevel.ERROR : LogLevel.INFO,
                message,
                metadata: (metadata ?? {}) as import('@prisma/client').Prisma.InputJsonValue,
                tags: [this.roleName, type.toLowerCase()],
            },
        });

        // Emit to Socket.io for real-time dashboard
        try {
            emitAgentLog(this.agentId, entry);
        } catch {
            // Socket.io may not be initialized in test env — ignore
        }
    }
}
