/**
 * BaseAgent — Abstract class shared by all AI role agents.
 * Each role agent (UX / BE / QA / DevOps) extends this class.
 */

import { prisma } from '@/lib/prisma';
import { callModel, ChatMessage, ModelConfig, ModelProvider } from '@/lib/model-router';
import { getAgentModelConfig } from '@/lib/model-config';
import { AgentStatus, LogType, LogLevel } from '@prisma/client';
import { emitAgentLog } from '@/lib/socket';
import {
    getRecentMemories, getLessons, getProjectSummary,
    saveMemory, formatMemoryBlock,
} from '@/lib/memory-store';
import { summarizeTaskResult, maybeRefreshProjectSummary } from '@/lib/memory-summarizer';

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
    projectId?: string;   // used to scope memories to a project
    metadata?: Record<string, unknown>;
}

// ── Base Agent ────────────────────────────────────────────────────────────────
export abstract class BaseAgent {
    /** DB id of this agent record */
    protected agentId!: string;

    /** Role name, e.g. "devops", "qa", "ux", "backend" */
    abstract readonly roleName: string;

    /** System prompt that defines this agent's persona and capabilities.
     *  Async so subclasses can call buildAgentPrompt() which loads DB skills. */
    abstract getSystemPrompt(): Promise<string>;

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

        const systemPrompt = await this.getSystemPrompt();

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: await this.buildReasoningPrompt(context),
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
                // No tool declared — ask the LLM to generate the actual deliverable
                // (e.g. write HTML, write config, write prose) rather than just re-emitting reasoning
                try {
                    const config = await this.getModelConfig();
                    const systemPrompt = await this.getSystemPrompt();
                    const generateMessages: import('@/lib/model-router').ChatMessage[] = [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: [
                                `Original task: ${context.userRequest}`,
                                `Step ${step.stepNumber}: ${step.action}`,
                                step.reasoning ? `Notes: ${step.reasoning}` : '',
                                '',
                                'Please produce the COMPLETE deliverable for this step.',
                                'CRITICAL: output the ENTIRE content — do NOT truncate, abbreviate, or add "<!-- ... more -->" placeholders.',
                                '',
                                'OUTPUT FORMAT RULES:',
                                '• If this deliverable is a SINGLE FILE (e.g. a simple HTML landing page): output the raw file content only.',
                                '• If this deliverable spans MULTIPLE FILES (e.g. a React app, Next.js project, mobile app, or any multi-file project structure):',
                                '  - Use the exact delimiter: === FILE: relative/path/filename.ext ===',
                                '  - Output EVERY file in full — do not skip or summarise any file.',
                                '  - Example:',
                                '    === FILE: package.json ===',
                                '    { "name": "my-app", ... }',
                                '    === FILE: src/index.tsx ===',
                                '    import React from "react";',
                                '    ...',
                                '• No extra commentary before, between, or after files.',
                            ].filter(Boolean).join('\n'),
                        },
                    ];
                    const { callModel } = await import('@/lib/model-router');
                    // Use a high token limit for generation — full HTML pages can be 6000-12000 tokens
                    const genConfig = { ...config, maxTokens: Math.max(config.maxTokens ?? 0, 16384) };
                    const response = await callModel(genConfig, generateMessages);
                    const generated = response.content;
                    await this.log(LogType.SUCCESS, `✅ Step ${step.stepNumber} generated: ${generated.slice(0, 120)}…`);
                    results.push(generated);
                } catch (genErr) {
                    // Fallback: emit reasoning so at least something is saved
                    const msg = genErr instanceof Error ? genErr.message : String(genErr);
                    await this.log(LogType.WARN as never, `⚠️ Step ${step.stepNumber} generation failed (${msg}) — using reasoning`);
                    results.push(`[Reasoning] ${step.reasoning}`);
                }
            }
        }

        await this.setStatus(AgentStatus.IDLE);
        await this.log(LogType.SUCCESS, `🎉 Task complete — ${results.length} steps executed`);
        return results;
    }

    /** High-level: reason then execute, then save memory */
    async run(context: TaskContext): Promise<{ plan: AgentPlan; results: string[] }> {
        if (!this.agentId) await this.initialize();
        const plan = await this.reason(context);
        const results = await this.execute(plan, context);

        // ── Save memory after task completes ──────────────────
        try {
            const memorySummary = await summarizeTaskResult({
                userRequest: context.userRequest,
                taskSummary: plan.taskSummary,
                results,
                agentRole: this.roleName,
            });

            await saveMemory({
                agentRole: this.roleName,
                content: memorySummary,
                projectId: context.projectId ?? null,
                taskId: context.taskId ?? null,
            });

            await this.log(LogType.INFO, `🧠 Memory saved: ${memorySummary.slice(0, 80)}…`);

            // Refresh project summary every 5 tasks
            if (context.projectId) {
                const recent = await getRecentMemories(this.roleName, context.projectId, 10);
                const currentSummary = await getProjectSummary(context.projectId);
                const allCount = await prisma.agentMemory.count({
                    where: { projectId: context.projectId }
                });
                await maybeRefreshProjectSummary({
                    projectId: context.projectId,
                    taskCount: allCount,
                    recentMemories: recent.map(m => m.content),
                    currentSummary,
                });
            }
        } catch {
            // Memory save failure must never crash the task result
        }

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
    private async buildReasoningPrompt(context: TaskContext): Promise<string> {
        // Fetch memory context in parallel
        const [memories, lessons, projectSummary] = await Promise.all([
            getRecentMemories(this.roleName, context.projectId ?? null, 5),
            getLessons(this.roleName, context.projectId ?? null),
            context.projectId ? getProjectSummary(context.projectId) : Promise.resolve(null),
        ]);

        const memoryBlock = formatMemoryBlock(memories, projectSummary, lessons);

        return `
You are a ${this.roleName} agent. Analyze this task and produce a JSON plan.
${memoryBlock ? `\n${memoryBlock}\n` : ''}
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
        const extracted = this.extractJson(responseContent);
        if (extracted !== null) {
            try {
                return JSON.parse(extracted) as AgentPlan;
            } catch { /* fall through */ }
        }

        // Fallback: treat the whole raw response as a single generate step
        // so execute() will call the LLM again and actually produce content
        return {
            taskSummary: responseContent.slice(0, 200),
            steps: [{
                stepNumber: 1,
                action: 'Generate deliverable based on task request',
                reasoning: responseContent.slice(0, 500),
                tool: undefined,
            }],
            riskLevel: 'LOW',
            requiresApproval: false,
        };
    }

    /** Extract the first complete JSON object from arbitrary text (handles markdown fences) */
    private extractJson(text: string): string | null {
        // 1. Strip common markdown fences first
        const stripped = text
            .replace(/^```json\s*/im, '')
            .replace(/^```\s*/im, '')
            .replace(/```\s*$/im, '')
            .trim();

        // 2. Try the stripped version directly
        if (stripped.startsWith('{')) {
            // Balance brackets to find the full object
            let depth = 0;
            let inString = false;
            let escape = false;
            for (let i = 0; i < stripped.length; i++) {
                const ch = stripped[i];
                if (escape) { escape = false; continue; }
                if (ch === '\\' && inString) { escape = true; continue; }
                if (ch === '"') { inString = !inString; continue; }
                if (inString) continue;
                if (ch === '{') depth++;
                if (ch === '}') { depth--; if (depth === 0) return stripped.slice(0, i + 1); }
            }
        }

        // 3. Scan original text for the first '{'
        const start = text.indexOf('{');
        if (start === -1) return null;
        let depth = 0;
        let inString = false;
        let escape = false;
        for (let i = start; i < text.length; i++) {
            const ch = text[i];
            if (escape) { escape = false; continue; }
            if (ch === '\\' && inString) { escape = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{') depth++;
            if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
        }

        return null;
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
