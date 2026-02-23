/**
 * DevOps Agent — SSH & Docker operations with LLM-powered reasoning.
 * Extends BaseAgent. Security Guardian filter runs before any SSH execution.
 */

import { AgentType } from '@prisma/client';
import { BaseAgent, AgentTool } from '@/agents/base.agent';
import { GuardianFilter } from '@/agents/security/filters';
import { sshTool } from '@/tools/ssh/ssh.tool';

// ── SSH Execute Tool ──────────────────────────────────────────────────────────
const sshExecuteTool: AgentTool = {
    name: 'ssh-execute',
    description: 'Execute a shell command on a remote VPS via SSH. Args: { command: string, vpsId: string }',
    async execute(args: Record<string, unknown>) {
        const command = args.command as string;
        const vpsId = args.vpsId as string;

        // Security filter before ANY execution
        const validation = await GuardianFilter.validate(command);
        if (!validation.isAllowed) {
            throw new Error(`Security blocked (${validation.riskLevel}): ${validation.blockReason}`);
        }

        // Look up VPS config from DB
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

    readonly systemPrompt = `You are a Senior DevOps Engineer AI agent with deep expertise in:
- Linux system administration and shell scripting
- Docker, Docker Compose, and container orchestration
- Nginx, systemd, and process management
- CI/CD pipelines, deployments, and rollbacks
- Security hardening and zero-trust principles

You manage infrastructure autonomously. You always:
1. Assess risk before executing any command
2. Prefer read-only commands to inspect state before mutating it
3. Avoid destructive operations unless explicitly authorized
4. Document every action with clear reasoning

You respond in structured JSON plans. Never execute commands that could damage the system.`;

    constructor() {
        super();
        this.tools = [sshExecuteTool, dockerExecuteTool];
    }

    getAgentType(): AgentType { return AgentType.DEVOPS; }
    getCapabilities(): string[] {
        return ['ssh', 'docker', 'deploy', 'systemd', 'nginx', 'monitoring'];
    }
}
