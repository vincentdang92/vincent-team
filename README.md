# 🛡️ AI DevOps Guardian

> **Multi-agent AI platform** — A team of specialized AI agents (DevOps, Backend, QA, UX, Security, Orchestrator) that collaborate to plan, execute, and deliver software engineering tasks. Agents are configurable per-project, per-stack, and per-LLM provider.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Agent Team](#agent-team)
3. [Core Libraries](#core-libraries)
4. [API Routes](#api-routes)
5. [Database Schema](#database-schema)
6. [Feature Map](#feature-map)
7. [Full Request Flow](#full-request-flow)
8. [Skill System](#skill-system)
9. [Agent Memory System](#agent-memory-system)
10. [Deployment Guide](#deployment-guide)
11. [Environment Variables](#environment-variables)
12. [Next Phase Roadmap](#next-phase-roadmap)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 (App Router)                  │
│  ┌──────────────────────┐   ┌──────────────────────────┐   │
│  │   Dashboard UI       │   │   API Routes (/api/*)    │   │
│  │   dashboard/page.tsx │   │   REST + Server-Sent     │   │
│  └──────────────────────┘   └──────────────────────────┘   │
│                                      │                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Agent Layer (src/agents/)               │   │
│  │  Orchestrator → DevOps / Backend / QA / UX / Sec    │   │
│  │      BaseAgent: Plan → Execute → Log → Return        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                      │                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Core Libraries (src/lib/)               │   │
│  │  model-router · prompt-builder · skill-loader        │   │
│  │  stack-library · memory-store · memory-summarizer    │   │
│  │  model-config · project-config · socket              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                      │                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Prisma ORM → Supabase (PostgreSQL)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                         │
  LLM Providers              External Tools
  Claude / Gemini /           SSH / VPS /
  DeepSeek / GPT-4o /          Git
  Ollama (local)
```

---

## Agent Team

| Agent | Role | Default Model |
|---|---|---|
| **Orchestrator** | Decomposes tasks, routes subtasks, synthesizes final output | Gemini 2.0 Flash |
| **DevOps** | CI/CD, Docker, Nginx, VPS provisioning, shell scripts | Gemini 2.0 Flash |
| **Backend** | APIs, databases, server logic, migrations | Gemini 2.0 Flash |
| **UX** | Frontend, HTML/CSS/React, design systems, animations | Gemini 2.0 Flash |
| **QA** | Tests, bug reports, coverage analysis, E2E planning | Gemini 2.0 Flash |
| **Security** | Vulnerability scan, OWASP, secrets audit, hardening | Gemini 2.0 Flash |

Each agent is independently configurable — different LLM provider, model, and API key per agent. Configuration is persisted in the `Agent.config` JSONB field in the database.

---

## Core Libraries

| File | Purpose |
|---|---|
| `model-router.ts` | Routes LLM calls to Claude / Gemini / DeepSeek / GPT-4o / Ollama |
| `prompt-builder.ts` | Composes dynamic system prompts: role + stack context + skills + memory |
| `skill-loader.ts` | Loads active skills from DB, applies **stack-aware OR-logic filtering** |
| `stack-library.ts` | Expert prompt snippets per tech (Bootstrap, Next.js, Docker, etc.) |
| `memory-store.ts` | Stores and retrieves agent short-term memories and lessons |
| `memory-summarizer.ts` | Summarizes completed tasks into project-level `ProjectSummary` |
| `model-config.ts` | Persists and loads per-agent LLM configuration |
| `project-config.ts` | Project stack configuration helpers |
| `socket.ts` | Server-Sent Events helper for real-time log streaming |
| `prisma.ts` | Prisma client singleton |

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/execute` | `POST` | Submit a user request → runs agent pipeline, streams logs via SSE |
| `/api/tasks` | `GET` | List all tasks (with status, results, logs) |
| `/api/agents` | `GET` | List all agents with status / config |
| `/api/agents/[id]` | `PATCH` | Update agent model/provider/API key |
| `/api/agents/[id]/logs` | `GET` | Stream real-time logs for an agent |
| `/api/skills` | `GET/POST` | List / create agent skills |
| `/api/skills/[id]` | `PATCH/DELETE` | Toggle active, update, or delete a skill |
| `/api/skills/preview` | `POST` | Build system prompt + optional real LLM test for a skill |
| `/api/projects` | `GET/POST` | List / create projects |
| `/api/projects/[id]` | `GET/PATCH/DELETE` | Get / update / delete a project + its stack |
| `/api/memories` | `GET/POST/DELETE` | Agent memory management |
| `/api/vps` | `GET` | List VPS servers |

---

## Database Schema

Managed via Prisma → Supabase (PostgreSQL). Apply schema with `manual_migration.sql`.

```
VPS                Agent               Project
├─ id              ├─ id               ├─ id
├─ name            ├─ name             ├─ name
├─ ip/port         ├─ type (enum)      ├─ description
├─ status (enum)   ├─ status (enum)    ├─ stack (JSONB)
└─ region          └─ config (JSONB)   └─ updatedAt
                        └─ provider/model/apiKey

Task               AgentSkill          AgentMemory
├─ id              ├─ id               ├─ id
├─ userRequest     ├─ name             ├─ agentRole
├─ status (enum)   ├─ content          ├─ memoryType (enum)
├─ assignedRole    ├─ agentRole        ├─ content
├─ results[]       ├─ priority         ├─ projectId
└─ projectId       ├─ isActive         └─ importance
                   ├─ stackTriggers    
                   └─ sourceUrl        ProjectSummary
                                       ├─ projectId (unique)
SubTask                                ├─ content
├─ taskId                              └─ taskCount
├─ agentRole
├─ status
└─ results[]
```

---

## Feature Map

### ✅ Implemented

| Feature | Status | Notes |
|---|---|---|
| Multi-agent task routing | ✅ Done | Orchestrator fan-out to role agents |
| Per-agent LLM config | ✅ Done | Provider + model + API key per agent, DB-persisted |
| Multi-provider LLM router | ✅ Done | Claude, Gemini, DeepSeek, GPT-4o, Ollama |
| Real-time log streaming | ✅ Done | SSE from `/api/agents/[id]/logs` |
| Project + Stack config | ✅ Done | 6 categories: frontend/backend/database/testing/deploy/mobile |
| Stack-aware prompt injection | ✅ Done | Expert snippets from stack-library injected per project |
| Agent Skill system | ✅ Done | Install custom SKILL.md files from marketplace |
| Stack-aware skill activation | ✅ Done | `stackTriggers` JSONB — OR-logic, auto-enables per stack |
| Skill test/preview modal | ✅ Done | Prompt-only (free) or real LLM call mode |
| Companion file merging | ✅ Done | Auto-detect `.md` refs, paste slots, merged on save |
| Agent short-term memory | ✅ Done | Per-role memories stored and injected into prompts |
| Project summary memory | ✅ Done | Auto-summarized after each task |
| Multi-file code output | ✅ Done | `=== FILE: path ===` format + FileTreeView UI + ZIP download |
| Project Wizard | ✅ Done | Guided stack selection with presets |
| Dashboard tabs | ✅ Done | Team / Tasks / Logs / Skills / Projects |

---

## Full Request Flow

```
User types task in Dashboard
        │
        ▼
POST /api/execute
        │
        ├─ Load active project + stack (from DB)
        ├─ Retrieve agent short-term memories
        ├─ Build system prompt:
        │     role intro → stack snippets → general rules
        │     → skills (stack-filtered) → memory context
        │
        ▼
OrchestratorAgent.execute()
        │
        ├─ Step 1: PLAN  →  LLM call → JSON plan [{step, action, role}]
        ├─ Step 2-N: ROUTE each step to the correct agent
        │     └─ BackendAgent / DevOpsAgent / QAAgent / UXAgent / SecurityAgent
        │           ├─ Agent loads its own system prompt (role-specific)
        │           ├─ Calls LLM (tool-use or generation)
        │           ├─ If tool call: execute tool (e.g. write file, run command)
        │           ├─ If generation: produce deliverable (code/html/config)
        │           └─ Logs every step via SSE → Dashboard real-time log panel
        │
        ▼
Task saved to DB (Task + SubTask rows)
Results saved to Task.results[]
        │
        ▼
memory-summarizer: appends to ProjectSummary
        │
        ▼
Dashboard receives result:
  - Single file → code viewer with syntax highlight + copy/download
  - Multi-file  → FileTreeView: per-file viewer + download ZIP
```

---

## Skill System

Skills are custom expert instruction files (`.md`) installed into the platform.

### Skill Activation Logic

```
Skill has stackTriggers?
  No  → Always injected (global skill)
  Yes → Injected only if ANY trigger key matches the active project stack (OR logic)
        e.g. { "frontend": "Bootstrap" } activates only for Bootstrap projects
```

### Skill Test Modal

Two modes in the 🧪 Test button:

| Mode | Cost | What it does |
|---|---|---|
| **📋 Prompt only** (default) | Free | Builds full system prompt with skill injected, shows result |
| **🤖 Real LLM call** | Token cost | Sends built prompt + test message to configured LLM |

### Companion Files

Skills may reference other `.md` files (table of dependencies). When you paste a skill, the form auto-detects all referenced `.md` filenames and shows paste slots. Contents are merged at save time with `<!-- companion: filename.md -->` markers.

---

## Agent Memory System

```
Short-term memory (AgentMemory table)
  - Stored after each task: key observations, decisions made
  - Type: SHORT_TERM (task facts) | LESSON (reusable patterns)
  - Injected into next task's system prompt for the same agent+project

Project-level summary (ProjectSummary table)
  - One row per project, updated after every completed task
  - Summarizes all prior work so agents have project context
  - Injected at the top of every prompt when a project is active
```

---

## Deployment Guide

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended)
- At least one LLM API key (Gemini, Claude, OpenAI, or DeepSeek)

### 1 — Clone & Install

```bash
git clone <repo>
cd ai-devops-guardian
npm install
```

### 2 — Configure Environment

Copy `.env.example` → `.env` and fill in:

```env
DATABASE_URL="postgresql://..."          # Supabase direct connection (port 5432)
DIRECT_URL="postgresql://..."           # Same URL for Prisma migrations
```

> API keys for LLM providers are set **per-agent** in the Dashboard UI and persisted in the `Agent.config` JSONB field — they do NOT go in `.env`.

### 3 — Apply Database Schema

Open **Supabase SQL Editor** → paste the entire contents of:

```
prisma/manual_migration.sql
```

This creates all tables with `IF NOT EXISTS` guards — safe to re-run on any fresh or existing database.

> **For existing databases** — the bottom section of `manual_migration.sql` contains `ALTER TABLE … ADD COLUMN IF NOT EXISTS` statements that apply new columns incrementally without data loss.

### 4 — Generate Prisma Client

```bash
npx prisma generate
```

> If you get `EPERM: operation not permitted` (Windows file lock), stop the dev server first, then re-run.

### 5 — Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### 6 — First-Run Setup in Dashboard

1. **Set API keys** — click each Agent card → configure provider + model + API key
2. **Create a Project** — click "+ New Project" → choose tech stack preset
3. **Install Skills** (optional) — Skills tab → paste SKILL.md content
4. **Submit a task** — type in the task input, click Execute

### Production Deployment (Vercel)

```bash
# Push to GitHub → connect repo in Vercel
# Set environment variable in Vercel dashboard:
DATABASE_URL = "postgresql://..."    # Supabase pooler URL (port 6543, pgbouncer=true)
DIRECT_URL   = "postgresql://..."    # Supabase direct URL (port 5432)
```

Vercel will auto-run `npm run build` on each deploy. No additional steps needed.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Supabase pooler for production) |
| `DIRECT_URL` | ✅ | Direct PostgreSQL URL (used by Prisma for migrations) |

> All LLM API keys (Gemini, Claude, OpenAI, DeepSeek) are stored **in the database** per agent — not in environment variables.

---

## Next Phase Roadmap

### Phase 6 — Enhanced Execution (Next)

| Feature | Priority | Description |
|---|---|---|
| **Real SSH / VPS execution** | 🔴 High | Actually run generated shell commands on connected VPS via SSH |
| **Agent approval gates** | 🔴 High | High-risk commands require user confirmation before execution |
| **File system write tool** | 🟡 Medium | Agents write generated files directly to a project directory on VPS |
| **Git integration tool** | 🟡 Medium | Auto-commit / push / create PR after task completes |

### Phase 7 — Skill Marketplace

| Feature | Priority | Description |
|---|---|---|
| **Skill discovery/search** | 🟡 Medium | Browse a remote skill registry by role, tag, rating |
| **One-click skill install** | 🟡 Medium | Install from URL — auto-fetch main skill + companion files |
| **Skill versioning** | 🟢 Low | Track skill version, show upgrade available badge |
| **Skill sharing** | 🟢 Low | Export local skill as shareable URL |

### Phase 8 — Multi-Project & Team

| Feature | Priority | Description |
|---|---|---|
| **Authentication (NextAuth)** | 🔴 High | User accounts, session management |
| **Team workspaces** | 🟡 Medium | Multiple users sharing projects + skills |
| **Role-based access control** | 🟡 Medium | Restrict which agents/tools each user can access |
| **Audit log** | 🟢 Low | Full history of who ran what task and when |

### Phase 9 — Observability

| Feature | Priority | Description |
|---|---|---|
| **Token usage dashboard** | 🟡 Medium | Per-agent, per-project token cost tracking |
| **Task replay** | 🟢 Low | Re-run any past task with the same or updated plan |
| **A/B agent comparison** | 🟢 Low | Run same task on two agents, compare outputs |
| **Skill effectiveness metrics** | 🟢 Low | Track agent output quality before/after skill activation |

---

## Project Structure

```
ai-devops-guardian/
├── prisma/
│   ├── schema.prisma          # Prisma data model
│   └── manual_migration.sql   # Full SQL migration (safe to re-run)
├── src/
│   ├── agents/
│   │   ├── base.agent.ts      # BaseAgent: plan → execute → log loop
│   │   ├── orchestrator/      # OrchestratorAgent: task decomposition
│   │   ├── devops/            # DevOpsAgent
│   │   ├── backend/           # BackendAgent
│   │   ├── qa/                # QAAgent
│   │   ├── ux/                # UXAgent
│   │   └── security/          # SecurityAgent
│   ├── app/
│   │   ├── api/               # REST API routes
│   │   │   ├── execute/       # Task submission
│   │   │   ├── agents/        # Agent CRUD + log streaming
│   │   │   ├── skills/        # Skill CRUD + preview
│   │   │   ├── projects/      # Project CRUD
│   │   │   ├── memories/      # Memory management
│   │   │   └── tasks/         # Task history
│   │   └── dashboard/
│   │       └── page.tsx       # Main dashboard UI (~2100 lines)
│   └── lib/
│       ├── model-router.ts    # Multi-provider LLM router
│       ├── prompt-builder.ts  # Dynamic system prompt composer
│       ├── skill-loader.ts    # Stack-aware skill fetcher
│       ├── stack-library.ts   # Per-tech expert prompt snippets
│       ├── memory-store.ts    # Agent memory CRUD
│       └── memory-summarizer.ts # Project summary generator
└── .env.example
```

---

*Last updated: 2026-02-25 — Phase 5 complete (Skills, Memory, Multi-file output, Skill Test Modal, Companion Files)*
