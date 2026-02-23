-- AI DevOps Guardian - Database Migration
-- Run this SQL in Supabase SQL Editor

-- Create ENUM types
CREATE TYPE "VPSStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'MAINTENANCE');
CREATE TYPE "AgentType" AS ENUM ('DEVOPS', 'SECURITY', 'BACKEND', 'FRONTEND', 'QA', 'ORCHESTRATOR');
CREATE TYPE "AgentStatus" AS ENUM ('IDLE', 'THINKING', 'EXECUTING', 'WAITING', 'ERROR');
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTING', 'SUCCESS', 'FAILED', 'BLOCKED', 'TIMEOUT');
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "LogType" AS ENUM ('INFO', 'WARN', 'ERROR', 'SUCCESS', 'REASONING', 'EXECUTION', 'SECURITY');
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL');
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'PREPARING', 'BUILDING', 'DEPLOYING', 'SUCCESS', 'FAILED', 'ROLLBACK');

-- Create VPS table
CREATE TABLE "VPS" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 22,
    "username" TEXT NOT NULL,
    "sshKeyPath" TEXT,
    "status" "VPSStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "region" TEXT,
    "provider" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastPingAt" TIMESTAMP(3),

    CONSTRAINT "VPS_pkey" PRIMARY KEY ("id")
);

-- Create Agent table
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "config" JSONB,
    "capabilities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3),

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- Create Deployment table
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "repository" TEXT,
    "branch" TEXT,
    "commitHash" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "agentId" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "logs" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- Create CommandHistory table
CREATE TABLE "CommandHistory" (
    "id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "rawInput" TEXT,
    "sanitized" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "exitCode" INTEGER,
    "stdout" TEXT,
    "stderr" TEXT,
    "duration" INTEGER,
    "agentId" TEXT NOT NULL,
    "vpsId" TEXT,
    "deploymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CommandHistory_pkey" PRIMARY KEY ("id")
);

-- Create AgentLog table
CREATE TABLE "AgentLog" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "LogType" NOT NULL DEFAULT 'INFO',
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "agentId" TEXT NOT NULL,
    "vpsId" TEXT,
    "metadata" JSONB,
    "tags" TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentLog_pkey" PRIMARY KEY ("id")
);

-- Create SystemMetric table
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "cpuUsage" DOUBLE PRECISION,
    "memoryUsage" DOUBLE PRECISION,
    "diskUsage" DOUBLE PRECISION,
    "networkIn" DOUBLE PRECISION,
    "networkOut" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "VPS_name_key" ON "VPS"("name");
CREATE UNIQUE INDEX "Agent_name_key" ON "Agent"("name");

-- Create indexes for performance
CREATE INDEX "VPS_status_idx" ON "VPS"("status");
CREATE INDEX "VPS_ip_idx" ON "VPS"("ip");
CREATE INDEX "Agent_type_idx" ON "Agent"("type");
CREATE INDEX "Agent_status_idx" ON "Agent"("status");
CREATE INDEX "Deployment_agentId_idx" ON "Deployment"("agentId");
CREATE INDEX "Deployment_vpsId_idx" ON "Deployment"("vpsId");
CREATE INDEX "Deployment_status_idx" ON "Deployment"("status");
CREATE INDEX "Deployment_createdAt_idx" ON "Deployment"("createdAt");
CREATE INDEX "CommandHistory_agentId_idx" ON "CommandHistory"("agentId");
CREATE INDEX "CommandHistory_vpsId_idx" ON "CommandHistory"("vpsId");
CREATE INDEX "CommandHistory_status_idx" ON "CommandHistory"("status");
CREATE INDEX "CommandHistory_isBlocked_idx" ON "CommandHistory"("isBlocked");
CREATE INDEX "CommandHistory_createdAt_idx" ON "CommandHistory"("createdAt");
CREATE INDEX "AgentLog_agentId_idx" ON "AgentLog"("agentId");
CREATE INDEX "AgentLog_vpsId_idx" ON "AgentLog"("vpsId");
CREATE INDEX "AgentLog_type_idx" ON "AgentLog"("type");
CREATE INDEX "AgentLog_timestamp_idx" ON "AgentLog"("timestamp");
CREATE INDEX "SystemMetric_vpsId_idx" ON "SystemMetric"("vpsId");
CREATE INDEX "SystemMetric_timestamp_idx" ON "SystemMetric"("timestamp");

-- Add foreign key constraints
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VPS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommandHistory" ADD CONSTRAINT "CommandHistory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommandHistory" ADD CONSTRAINT "CommandHistory_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VPS"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommandHistory" ADD CONSTRAINT "CommandHistory_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VPS"("id") ON DELETE SET NULL ON UPDATE CASCADE;
