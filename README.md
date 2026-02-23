# 🛡️ AI DevOps Guardian

<div align="center">

**The world's most paranoid, stack-aware, skill-powered AI team for your codebase.**

[![Phase](https://img.shields.io/badge/Phase-4%20Complete-blueviolet?style=for-the-badge)](.)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)](.)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](.)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma)](.)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](.)

</div>

---

## 🧠 What Is This?

AI DevOps Guardian is a **fully autonomous multi-agent AI team** that manages your software projects end-to-end — from writing code to deploying on production VPS — with **military-grade security** that blocks catastrophic commands before they run.

You describe what you want. The Orchestrator routes the task to the right specialist. The specialist reasons, plans, executes, and reports back. All guarded by a paranoid Security Guardian that intercepts every shell command before it touches your servers.

Think of it as hiring 6 elite senior engineers — except they never sleep, never cut corners, and literally cannot run `rm -rf /`.

---

## 👥 The Team

| Agent | Emoji | Speciality | Tools |
|---|---|---|---|
| **Orchestrator** | 🧠 | Reads your request, classifies the task, routes to the right agent | Reasoning, Planning |
| **DevOps Senior** | ⚙️ | SSH, Docker, Nginx, CI/CD, systemd, server health | `ssh-execute`, `docker-run` |
| **Backend Senior** | 🛠️ | REST APIs, DB schemas, auth, business logic, CRUD | `file-write`, `file-read` |
| **QA Senior** | 🧪 | Test writing, code review, coverage, bug reproduction | `file-write`, `run-tests` |
| **UX Senior** | 🎨 | React components, accessibility, animations, responsive layouts | `file-write`, `list-dir` |
| **Security Guardian** | 🛡️ | Validates every shell command. Blocks CRITICAL. Logs HIGH. | Pattern matching, risk scoring |

Every agent:
- Has a **dynamic system prompt** built from your project's tech stack
- **Injects your custom skills** from the Skills Library at prompt time
- Follows a **reason → plan → execute** loop before touching anything

---

## 🌟 Key Features

### 🔐 Zero-Trust Security Guardian
Every SSH/Docker command passes through a 4-layer filter:

```
Command → Sanitize → Obfuscation Detection → Pattern Match → Risk Score → Verdict
```

| Risk | Action | Example |
|---|---|---|
| `CRITICAL (100)` | **Auto-blocked, logged** | `rm -rf /`, fork bombs, disk wipes |
| `HIGH (75+)` | **Blocked, requires approval** | `chmod 777 /etc`, system shutdown |
| `MEDIUM (40+)` | **Allowed, audited** | `npm install -g`, `chmod 777 /tmp` |
| `LOW (0-39)` | **Allowed** | `ls -la`, `docker ps`, `git status` |

Even obfuscated attacks are caught:
```bash
echo "cm0gLXJmIC8=" | base64 -d | bash  # ❌ BLOCKED — obfuscation detected
$(rm -rf /)                              # ❌ BLOCKED — command substitution detected
```

---

### 📦 Stack-Aware Prompts
Every agent's system prompt is **generated dynamically** from your project's configured technology stack. A backend agent working on a Laravel + MySQL project gets completely different expertise than one working on NestJS + Prisma.

Supported stack categories:

| Category | Options |
|---|---|
| **Frontend** | React, Vue, Svelte, Next.js, Nuxt, Angular, Astro |
| **Backend** | Express, NestJS, FastAPI, Laravel, Django, Rails, Go Fiber, Hono |
| **Database** | PostgreSQL, MySQL, MongoDB, SQLite, Supabase, Redis |
| **Testing** | Vitest, Jest, PyTest, Playwright, Cypress |
| **Deploy** | Docker, Kubernetes, PM2, Nginx, Vercel, Railway, Fly.io |
| **Mobile** | React Native, Flutter, Swift, Kotlin, Capacitor |

---

### 🧠 Custom Skills (Phase 4)
Install expert knowledge directly into any agent's brain from platforms like [SkillsMP.com](https://skillsmp.com).

1. Paste a `SKILL.md` content into the Dashboard → **Skills** tab
2. Assign it to a specific agent (`devops`, `backend`, `qa`, `ux`) or **all agents**
3. Set priority (Normal / High / Critical)
4. The skill is **injected into the agent's system prompt** on every single task — forever

```
[Skill: Kubernetes Expert] → injected into DevOps prompt
[Skill: TDD Master]        → injected into QA prompt
[Skill: WCAG Specialist]   → injected into UX prompt
[Skill: SQL Optimizer]     → injected into Backend prompt
```

Skills are stored in the database, toggled on/off in real-time, no server restart needed.

---

### 📊 Real-Time Dashboard
Dark cyberpunk command center with four tabs:

- **👥 Team** — Live status of all 6 agents, model switcher per agent, stack stack badges
- **📋 Tasks** — Task history, status tracking (`THINKING → EXECUTING → SUCCESS`)
- **📡 Logs** — Real-time agent reasoning stream (what they're actually thinking)
- **🧠 Skills** — Skill library management with paste form, toggle, and delete

Switch AI model per agent at runtime: **Claude, Gemini, GPT-4o, DeepSeek, Ollama**

---

### 🏗️ Multi-Model Support
```typescript
// Each agent can run a different AI provider
DevOps Agent    → Claude 3.5 Sonnet (complex reasoning)
Backend Agent   → Gemini 2.0 Flash (fast code generation)
QA Agent        → DeepSeek Coder (specialized)
UX Agent        → GPT-4o (design reasoning)
Orchestrator    → Ollama/Llama3 (local, fast routing)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- PostgreSQL database
- (Optional) SSH access to a VPS

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in DATABASE_URL and at least one AI provider key

# 3. Init database
npx prisma generate
npx prisma db push

# 4. Start
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ai_guardian"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# At least one AI provider
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_GENERATIVE_AI_API_KEY="..."
OPENAI_API_KEY="sk-..."
DEEPSEEK_API_KEY="..."

# For local models (optional)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.1"
```

---

## 📁 Project Structure

```
ai-devops-guardian/
├── prisma/
│   └── schema.prisma              # 8 models: VPS, Agent, Task, SubTask,
│                                  #   AgentLog, CommandHistory, Project, AgentSkill
├── src/
│   ├── agents/
│   │   ├── base.agent.ts          # Abstract base with reason→plan→execute loop
│   │   ├── orchestrator/          # 🧠 Task router & planner
│   │   ├── devops/                # ⚙️ SSH + Docker specialist
│   │   ├── backend/               # 🛠️ API + DB specialist
│   │   ├── qa/                    # 🧪 Testing specialist
│   │   ├── ux/                    # 🎨 UI/UX specialist
│   │   └── security/              # 🛡️ Guardian filter (always on)
│   ├── lib/
│   │   ├── model-router.ts        # Multi-provider AI abstraction
│   │   ├── model-config.ts        # Per-agent model config (DB-backed)
│   │   ├── prompt-builder.ts      # Async stack-aware + skill-injecting prompt builder
│   │   ├── skill-loader.ts        # Fetches active AgentSkills from DB at prompt time
│   │   ├── stack-library.ts       # 30+ tech options across 6 categories
│   │   └── project-config.ts      # Project ↔ stack config resolver
│   ├── tools/
│   │   └── ssh/                   # SSH execution tool (guarded)
│   └── app/
│       ├── api/
│       │   ├── tasks/             # POST /api/tasks → triggers orchestrator
│       │   ├── agents/[id]/model  # PATCH → switch AI model per agent
│       │   ├── projects/          # CRUD for projects with stack config
│       │   └── skills/            # CRUD for AgentSkills
│       └── dashboard/             # The War Room (4-tab cyberpunk UI)
```

---

## 🔌 API Reference

### Submit a Task
```bash
POST /api/tasks
{ "userRequest": "Deploy the API to production", "projectId": "proj_..." }
```

### Manage Skills
```bash
GET    /api/skills               # List all skills (filter by ?agentRole=devops)
POST   /api/skills               # Install new skill
PATCH  /api/skills/:id           # Toggle active, update priority
DELETE /api/skills/:id           # Remove skill
```

### Manage Projects
```bash
GET    /api/projects             # List projects
POST   /api/projects             # Create project with stack config
PATCH  /api/projects/:id         # Update stack
```

### Switch Agent Model
```bash
PATCH /api/agents/:id/model
{ "provider": "GEMINI" }       # CLAUDE | GEMINI | GPT4O | DEEPSEEK | OLLAMA
```

---

## 🏛️ Architecture

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────┐
│                  Orchestrator                    │
│  ┌────────────────────────────────────────────┐ │
│  │ Project Stack + Active Skills → Prompt     │ │
│  │ Classify → Route → Plan                   │ │
│  └────────────────────────────────────────────┘ │
└──┬────────┬──────────────┬──────────┬───────────┘
   │        │              │          │
   ▼        ▼              ▼          ▼
DevOps   Backend          QA         UX
Agent    Agent           Agent      Agent
   │        │              │          │
   │   [Stack Prompt + Injected Skills]
   │        │              │          │
   ▼        ▼              ▼          ▼
┌─────────────────────────────────────────────────┐
│            🛡️ Security Guardian Filter           │
│        Validate → Risk Score → Allow/Block       │
└─────────────────────────────────────────────────┘
         │
         ▼
    SSH / Docker / File System / Test Runner
```

---

## 📈 Roadmap

### ✅ Phase 1 — Foundation
- Security Guardian filter (4-layer, CRITICAL auto-block)
- DevOps Agent with SSH + Docker tools
- Prisma schema, API routes, Dashboard UI

### ✅ Phase 2 — Full Team
- BaseAgent with reason → plan → execute loop
- Backend, QA, UX Senior agents
- Orchestrator with keyword-based task routing
- Multi-model support (Claude, Gemini, GPT-4o, DeepSeek, Ollama)
- Real-time Socket.io log streaming

### ✅ Phase 3 — Stack Intelligence
- 30+ technology options across 6 stack categories
- Project wizard with stack selection
- Dynamic stack-aware system prompts per agent
- Per-agent AI model switching from the dashboard

### ✅ Phase 4 — Custom Skills
- `AgentSkill` DB model with role targeting and priority
- Full CRUD API (`/api/skills`)
- `skill-loader.ts` — DB skills injected at prompt build time
- Dashboard **🧠 Skills** tab with paste form, toggle, delete
- Support for [SkillsMP.com](https://skillsmp.com) skill format

### 🔜 Phase 5 — Coming Next
- [ ] Auto-fetch skills from GitHub URLs
- [ ] Approval workflow UI for HIGH-risk tasks
- [ ] Agent memory (context across multiple tasks)
- [ ] Multi-project workspace switching
- [ ] Webhook triggers (GitHub Actions, CI events)
- [ ] Deployment rollback with one click

---

## 🤝 Contributing

PRs welcome. Start by opening an issue to discuss what you'd like to add.

---

## 📄 License

MIT — go build something great.

---

<div align="center">

**Built with ❤️ & 🛡️ by QuocAnhPC**

*Phase 4 Complete — 6 agents, 30+ stacks, unlimited skills, zero `rm -rf /`*

</div>
