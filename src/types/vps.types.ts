// VPS Types
export type { VPS, VPSStatus } from '@prisma/client';

export interface SSHConfig {
    host: string;
    port: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
}

export interface VPSConnection {
    vpsId: string;
    isConnected: boolean;
    lastPing?: Date;
}
