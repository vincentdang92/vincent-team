import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '@/types/socket.types';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;

export function initSocketServer(httpServer: HTTPServer) {
    if (io) {
        return io;
    }

    io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
        cors: {
            origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Handle agent subscription
        socket.on('agent:subscribe', (agentId) => {
            socket.join(`agent:${agentId}`);
            console.log(`Client ${socket.id} subscribed to agent ${agentId}`);
        });

        // Handle agent unsubscription
        socket.on('agent:unsubscribe', (agentId) => {
            socket.leave(`agent:${agentId}`);
            console.log(`Client ${socket.id} unsubscribed from agent ${agentId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
}

export function getSocketServer(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null {
    return io;
}

/**
 * Emit agent log to all subscribed clients
 */
export function emitAgentLog(agentId: string, log: any) {
    if (io) {
        io.to(`agent:${agentId}`).emit('agent:log', log);
    }
}

/**
 * Emit agent status update
 */
export function emitAgentStatus(agentId: string, status: any) {
    if (io) {
        io.to(`agent:${agentId}`).emit('agent:status', status);
    }
}

/**
 * Emit command update
 */
export function emitCommandUpdate(commandId: string, update: any) {
    if (io) {
        io.emit('command:update', update);
    }
}

/**
 * Emit security alert
 */
export function emitSecurityAlert(alert: any) {
    if (io) {
        io.emit('security:alert', alert);
    }
}

/**
 * Emit deployment progress
 */
export function emitDeploymentProgress(deploymentId: string, progress: any) {
    if (io) {
        io.emit('deployment:progress', progress);
    }
}
