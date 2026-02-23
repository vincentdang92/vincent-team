// Socket.io Event Types

export interface ServerToClientEvents {
    'agent:log': (data: AgentLogEvent) => void;
    'agent:status': (data: AgentStatusEvent) => void;
    'command:update': (data: CommandUpdateEvent) => void;
    'security:alert': (data: SecurityAlertEvent) => void;
    'deployment:progress': (data: DeploymentProgressEvent) => void;
}

export interface ClientToServerEvents {
    'command:execute': (data: ExecuteCommandData) => void;
    'agent:subscribe': (agentId: string) => void;
    'agent:unsubscribe': (agentId: string) => void;
}

export interface AgentLogEvent {
    agentId: string;
    agentName: string;
    message: string;
    type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'REASONING' | 'EXECUTION' | 'SECURITY';
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    timestamp: string;
    metadata?: Record<string, any>;
}

export interface AgentStatusEvent {
    agentId: string;
    status: 'IDLE' | 'THINKING' | 'EXECUTING' | 'WAITING' | 'ERROR';
}

export interface CommandUpdateEvent {
    commandId: string;
    status: 'PENDING' | 'APPROVED' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'TIMEOUT';
    output?: string;
    error?: string;
}

export interface SecurityAlertEvent {
    commandId: string;
    command: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    blockReason?: string;
    isBlocked: boolean;
    detectedPatterns: string[];
}

export interface DeploymentProgressEvent {
    deploymentId: string;
    progress: number; // 0-100
    status: string;
    message?: string;
}

export interface ExecuteCommandData {
    command: string;
    vpsId: string;
    agentId?: string;
}
