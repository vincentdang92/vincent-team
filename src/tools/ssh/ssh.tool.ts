import { NodeSSH, Config as SSHConfig } from 'node-ssh';
import { SSHConfig as CustomSSHConfig, VPSConnection } from '@/types/vps.types';
import { readFileSync } from 'fs';

/**
 * SSH Tool - Manages SSH connections and command execution
 */
export class SSHTool {
    private connections: Map<string, NodeSSH> = new Map();

    /**
     * Execute command on VPS
     */
    async execute(
        command: string,
        vpsConfig: CustomSSHConfig
    ): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
        duration: number;
    }> {
        const startTime = Date.now();

        try {
            const ssh = await this.getConnection(vpsConfig);

            const result = await ssh.execCommand(command, {
                cwd: '/home/' + vpsConfig.username,
            });

            const duration = Date.now() - startTime;

            return {
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.code || 0,
                duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            throw {
                stdout: '',
                stderr: error instanceof Error ? error.message : 'Unknown error',
                exitCode: 1,
                duration,
            };
        }
    }

    /**
     * Get or create SSH connection
     */
    private async getConnection(config: CustomSSHConfig): Promise<NodeSSH> {
        const connectionKey = `${config.host}:${config.port}:${config.username}`;

        // Reuse existing connection if available
        if (this.connections.has(connectionKey)) {
            const existing = this.connections.get(connectionKey)!;
            if (existing.isConnected()) {
                return existing;
            }
        }

        // Create new connection
        const ssh = new NodeSSH();

        const sshConfig: SSHConfig = {
            host: config.host,
            port: config.port,
            username: config.username,
        };

        // Use private key or password
        if (config.privateKeyPath) {
            sshConfig.privateKey = readFileSync(config.privateKeyPath, 'utf8');
        } else if (config.password) {
            sshConfig.password = config.password;
        } else {
            throw new Error('Either privateKeyPath or password must be provided');
        }

        await ssh.connect(sshConfig);

        this.connections.set(connectionKey, ssh);

        return ssh;
    }

    /**
     * Test connection to VPS
     */
    async testConnection(config: CustomSSHConfig): Promise<boolean> {
        try {
            const ssh = await this.getConnection(config);
            const result = await ssh.execCommand('echo "test"');
            return result.code === 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Close connection
     */
    async closeConnection(vpsId: string): Promise<void> {
        if (this.connections.has(vpsId)) {
            const ssh = this.connections.get(vpsId)!;
            ssh.dispose();
            this.connections.delete(vpsId);
        }
    }

    /**
     * Close all connections
     */
    async closeAllConnections(): Promise<void> {
        for (const [key, ssh] of this.connections.entries()) {
            ssh.dispose();
        }
        this.connections.clear();
    }
}

// Singleton instance
export const sshTool = new SSHTool();
