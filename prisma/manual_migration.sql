-- AI DevOps Guardian - Full Database Migration
-- Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / DO blocks to skip already-created objects

-- ============================================================
-- ENUM TYPES
-- ============================================================
DO $$ BEGIN CREATE TYPE "VPSStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'MAINTENANCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AgentType" AS ENUM ('DEVOPS', 'SECURITY', 'BACKEND', 'FRONTEND', 'QA', 'ORCHESTRATOR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AgentStatus" AS ENUM ('IDLE', 'THINKING', 'EXECUTING', 'WAITING', 'ERROR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ModelProvider" AS ENUM ('CLAUDE', 'GEMINI', 'DEEPSEEK', 'GPT4O', 'OLLAMA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTING', 'SUCCESS', 'FAILED', 'BLOCKED', 'TIMEOUT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LogType" AS ENUM ('INFO', 'WARN', 'ERROR', 'SUCCESS', 'REASONING', 'EXECUTION', 'SECURITY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'PREPARING', 'BUILDING', 'DEPLOYING', 'SUCCESS', 'FAILED', 'ROLLBACK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'SUCCESS', 'FAILED', 'WAITING_APPROVAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MemoryType" AS ENUM ('SHORT_TERM', 'LESSON'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1. VPS
-- ============================================================
CREATE TABLE IF NOT EXISTS "VPS" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "ip"          TEXT NOT NULL,
    "port"        INTEGER NOT NULL DEFAULT 22,
    "username"    TEXT NOT NULL,
    "sshKeyPath"  TEXT,
    "status"      "VPSStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "region"      TEXT,
    "provider"    TEXT,
    "tags"        TEXT[],
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "lastPingAt"  TIMESTAMP(3),
    CONSTRAINT "VPS_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VPS_name_key" ON "VPS"("name");
CREATE INDEX IF NOT EXISTS "VPS_status_idx" ON "VPS"("status");
CREATE INDEX IF NOT EXISTS "VPS_ip_idx" ON "VPS"("ip");

-- ============================================================
-- 2. Agent
-- ============================================================
CREATE TABLE IF NOT EXISTS "Agent" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "type"         "AgentType" NOT NULL,
    "status"       "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "config"       JSONB,
    "capabilities" TEXT[],
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3),
    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Agent_name_key" ON "Agent"("name");
CREATE INDEX IF NOT EXISTS "Agent_type_idx" ON "Agent"("type");
CREATE INDEX IF NOT EXISTS "Agent_status_idx" ON "Agent"("status");

-- ============================================================
-- 3. Deployment
-- ============================================================
CREATE TABLE IF NOT EXISTS "Deployment" (
    "id"           TEXT NOT NULL,
    "projectName"  TEXT NOT NULL,
    "repository"   TEXT,
    "branch"       TEXT,
    "commitHash"   TEXT,
    "status"       "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "progress"     INTEGER NOT NULL DEFAULT 0,
    "agentId"      TEXT NOT NULL,
    "vpsId"        TEXT NOT NULL,
    "logs"         TEXT,
    "errorMessage" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt"    TIMESTAMP(3),
    "completedAt"  TIMESTAMP(3),
    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Deployment_agentId_idx" ON "Deployment"("agentId");
CREATE INDEX IF NOT EXISTS "Deployment_vpsId_idx" ON "Deployment"("vpsId");
CREATE INDEX IF NOT EXISTS "Deployment_status_idx" ON "Deployment"("status");
CREATE INDEX IF NOT EXISTS "Deployment_createdAt_idx" ON "Deployment"("createdAt");

-- ============================================================
-- 4. CommandHistory
-- ============================================================
CREATE TABLE IF NOT EXISTS "CommandHistory" (
    "id"           TEXT NOT NULL,
    "command"      TEXT NOT NULL,
    "rawInput"     TEXT,
    "sanitized"    TEXT,
    "isBlocked"    BOOLEAN NOT NULL DEFAULT false,
    "blockReason"  TEXT,
    "riskLevel"    "RiskLevel" NOT NULL DEFAULT 'LOW',
    "status"       "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "exitCode"     INTEGER,
    "stdout"       TEXT,
    "stderr"       TEXT,
    "duration"     INTEGER,
    "agentId"      TEXT NOT NULL,
    "vpsId"        TEXT,
    "deploymentId" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt"   TIMESTAMP(3),
    "completedAt"  TIMESTAMP(3),
    CONSTRAINT "CommandHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommandHistory_agentId_idx" ON "CommandHistory"("agentId");
CREATE INDEX IF NOT EXISTS "CommandHistory_vpsId_idx" ON "CommandHistory"("vpsId");
CREATE INDEX IF NOT EXISTS "CommandHistory_status_idx" ON "CommandHistory"("status");
CREATE INDEX IF NOT EXISTS "CommandHistory_isBlocked_idx" ON "CommandHistory"("isBlocked");
CREATE INDEX IF NOT EXISTS "CommandHistory_createdAt_idx" ON "CommandHistory"("createdAt");

-- ============================================================
-- 5. AgentLog
-- ============================================================
CREATE TABLE IF NOT EXISTS "AgentLog" (
    "id"        TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "type"      "LogType" NOT NULL DEFAULT 'INFO',
    "level"     "LogLevel" NOT NULL DEFAULT 'INFO',
    "agentId"   TEXT NOT NULL,
    "vpsId"     TEXT,
    "metadata"  JSONB,
    "tags"      TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgentLog_agentId_idx" ON "AgentLog"("agentId");
CREATE INDEX IF NOT EXISTS "AgentLog_vpsId_idx" ON "AgentLog"("vpsId");
CREATE INDEX IF NOT EXISTS "AgentLog_type_idx" ON "AgentLog"("type");
CREATE INDEX IF NOT EXISTS "AgentLog_timestamp_idx" ON "AgentLog"("timestamp");

-- ============================================================
-- 6. SystemMetric
-- ============================================================
CREATE TABLE IF NOT EXISTS "SystemMetric" (
    "id"           TEXT NOT NULL,
    "vpsId"        TEXT NOT NULL,
    "cpuUsage"     DOUBLE PRECISION,
    "memoryUsage"  DOUBLE PRECISION,
    "diskUsage"    DOUBLE PRECISION,
    "networkIn"    DOUBLE PRECISION,
    "networkOut"   DOUBLE PRECISION,
    "timestamp"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SystemMetric_vpsId_idx" ON "SystemMetric"("vpsId");
CREATE INDEX IF NOT EXISTS "SystemMetric_timestamp_idx" ON "SystemMetric"("timestamp");

-- ============================================================
-- 7. Project
-- ============================================================
CREATE TABLE IF NOT EXISTS "Project" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "stack"       JSONB NOT NULL DEFAULT '{}',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Project_createdAt_idx" ON "Project"("createdAt");

-- ============================================================
-- 8. Task
-- ============================================================
CREATE TABLE IF NOT EXISTS "Task" (
    "id"           TEXT NOT NULL,
    "userRequest"  TEXT NOT NULL,
    "summary"      TEXT,
    "status"       "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assignedRole" TEXT,
    "results"      TEXT[],
    "projectId"    TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt"    TIMESTAMP(3),
    "completedAt"  TIMESTAMP(3),
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");
CREATE INDEX IF NOT EXISTS "Task_createdAt_idx" ON "Task"("createdAt");
CREATE INDEX IF NOT EXISTS "Task_projectId_idx" ON "Task"("projectId");

-- ============================================================
-- 9. SubTask
-- ============================================================
CREATE TABLE IF NOT EXISTS "SubTask" (
    "id"          TEXT NOT NULL,
    "taskId"      TEXT NOT NULL,
    "agentRole"   TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status"      "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "results"     TEXT[],
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SubTask_taskId_idx" ON "SubTask"("taskId");
CREATE INDEX IF NOT EXISTS "SubTask_agentRole_idx" ON "SubTask"("agentRole");

-- ============================================================
-- 10. AgentSkill
-- ============================================================
CREATE TABLE IF NOT EXISTS "AgentSkill" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "agentRole"    TEXT NOT NULL DEFAULT 'all',
    "content"      TEXT NOT NULL,
    "sourceUrl"    TEXT,
    "sourceAuthor" TEXT,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "priority"     INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentSkill_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgentSkill_agentRole_idx" ON "AgentSkill"("agentRole");
CREATE INDEX IF NOT EXISTS "AgentSkill_isActive_idx" ON "AgentSkill"("isActive");

-- ============================================================
-- 11. AgentMemory (Phase 5A)
-- ============================================================
CREATE TABLE IF NOT EXISTS "AgentMemory" (
    "id"         TEXT NOT NULL,
    "agentRole"  TEXT NOT NULL,
    "projectId"  TEXT,
    "memoryType" "MemoryType" NOT NULL DEFAULT 'SHORT_TERM',
    "content"    TEXT NOT NULL,
    "taskId"     TEXT,
    "importance" INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgentMemory_agentRole_idx" ON "AgentMemory"("agentRole");
CREATE INDEX IF NOT EXISTS "AgentMemory_projectId_idx" ON "AgentMemory"("projectId");
CREATE INDEX IF NOT EXISTS "AgentMemory_memoryType_idx" ON "AgentMemory"("memoryType");
CREATE INDEX IF NOT EXISTS "AgentMemory_createdAt_idx" ON "AgentMemory"("createdAt");

-- ============================================================
-- 12. ProjectSummary
-- ============================================================
CREATE TABLE IF NOT EXISTS "ProjectSummary" (
    "id"        TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "taskCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectSummary_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectSummary_projectId_key" ON "ProjectSummary"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectSummary_projectId_idx" ON "ProjectSummary"("projectId");

-- ============================================================
-- FOREIGN KEY CONSTRAINTS (add only if not already present)
-- ============================================================
DO $$ BEGIN
    ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VPS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "CommandHistory" ADD CONSTRAINT "CommandHistory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "CommandHistory" ADD CONSTRAINT "CommandHistory_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VPS"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "CommandHistory" ADD CONSTRAINT "CommandHistory_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VPS"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
