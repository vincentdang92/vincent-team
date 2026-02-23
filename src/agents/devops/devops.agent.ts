/**
 * DevOps Senior Agent — dynamic system prompt + stack-aware deploy advice.
 */

import { AgentType } from '@prisma/client';
import { BaseAgent, AgentTool } from '@/agents/base.agent';
import { GuardianFilter } from '@/agents/security/filters';
import { sshTool } from '@/tools/ssh/ssh.tool';
import { StackConfig } from '@/lib/stack-library';
import { buildAgentPrompt } from '@/lib/prompt-builder';

// ── SSH Execute Tool ──────────────────────────────────────────────────────────
const sshExecuteTool: AgentTool = {
    name: 'ssh-execute',
    description: 'Execute a shell command on a remote VPS via SSH. Args: { command: string, vpsId: string }',
    async execute(args: Record<string, unknown>) {
        const command = args.command as string;
        const vpsId = args.vpsId as string;

        const validation = await GuardianFilter.validate(command);
        if (!validation.isAllowed) {
            throw new Error(`Security blocked (${validation.riskLevel}): ${validation.blockReason}`);
        }

        const { prisma } = await import('@/lib/prisma');
        const vps = await prisma.vPS.findUnique({ where: { id: vpsId } });
        if (!vps) throw new Error(`VPS not found: ${vpsId}`);
        if (!vps.sshKeyPath) throw new Error(`VPS ${vpsId} has no SSH key configured`);

        const result = await sshTool.execute(command, {
            host: vps.ip,
            port: vps.port,
            username: vps.username,
            privateKeyPath: vps.sshKeyPath,
        });

        return `Exit ${result.exitCode}: ${result.stdout || result.stderr}`;
    },
};

// ── Docker Tool ───────────────────────────────────────────────────────────────
const dockerExecuteTool: AgentTool = {
    name: 'docker-run',
    description: 'Run a docker or docker-compose command on a VPS. Args: { command: string, vpsId: string }',
    async execute(args: Record<string, unknown>) {
        const command = `docker ${args.command as string}`;
        const vpsId = args.vpsId as string;

        const validation = await GuardianFilter.validate(command);
        if (!validation.isAllowed) {
            throw new Error(`Security blocked: ${validation.blockReason}`);
        }

        const { prisma } = await import('@/lib/prisma');
        const vps = await prisma.vPS.findUnique({ where: { id: vpsId } });
        if (!vps) throw new Error(`VPS not found: ${vpsId}`);
        if (!vps.sshKeyPath) throw new Error(`VPS ${vpsId} has no SSH key configured`);

        const result = await sshTool.execute(command, {
            host: vps.ip,
            port: vps.port,
            username: vps.username,
            privateKeyPath: vps.sshKeyPath,
        });

        return `Exit ${result.exitCode}: ${result.stdout || result.stderr}`;
    },
};

// ── DevOps Agent ──────────────────────────────────────────────────────────────
export class DevOpsAgent extends BaseAgent {
    readonly roleName = 'devops';
    private projectStack: StackConfig;

    constructor(stack: StackConfig = {}) {
        super();
        this.projectStack = stack;
        this.tools = [sshExecuteTool, dockerExecuteTool];
    }

    async getSystemPrompt(): Promise<string> {
        return buildAgentPrompt('devops', this.projectStack, `
- ALWAYS run read-only commands first (df -h, docker ps, systemctl status) before mutations
- Security Guardian filter validates every command before execution
- For deployments: pull image → stop old → start new → verify health
- Never run commands that could cause data loss without explicit confirmation`);
    }

    getAgentType(): AgentType { return AgentType.DEVOPS; }
    getCapabilities(): string[] {
        return ['ssh', 'docker', 'deploy', 'systemd', 'nginx', 'monitoring'];
    }
}
