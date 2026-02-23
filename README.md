# 🛡️ AI DevOps Guardian - Phase 1

> **AI-Managed Infrastructure with Zero-Trust Security**

An autonomous Multi-Agent system for managing VPS, deployments, and CI/CD pipelines with military-grade security validation.

![Status](https://img.shields.io/badge/Status-Phase%201%20Complete-success)
![Node](https://img.shields.io/badge/Node-v20.11.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

---

## 🎯 Vision

Build a **"Hệ thần kinh trung ương"** (Central Nervous System) for an AI Team where agents autonomously manage infrastructure while maintaining **absolute safety** through multi-layer security validation.

---

## ✨ Features

### 🛡️ Security First
- **Guardian Filter**: Multi-layer validation (Sanitization → Obfuscation Detection → Pattern Matching → Risk Scoring)
- **Risk Levels**: CRITICAL (auto-block), HIGH (require approval), MEDIUM (log & allow)
- **Audit Trail**: Complete command history including blocked attempts
- **Obfuscation Detection**: Catches base64, hex, and variable expansion tricks

### 🤖 Multi-Agent System
- **DevOps Agent**: SSH & Docker operations
- **Security Guardian**: Command validation
- **Backend/Frontend/QA Agents**: Coming in Phase 2
- **Reasoning Logs**: See agent's thought process in real-time

### 📊 Real-time Dashboard
- **Cyberpunk UI**: Dark theme with glow effects
- **The War Room**: Command center with live terminal
- **Agent Monitoring**: Status tracking for all agents
- **Socket.io**: Real-time log streaming

### 🏗️ Production-Ready Stack
- Next.js 15 (App Router)
- Prisma + PostgreSQL
- Socket.io
- Zustand
- TypeScript
- Tailwind CSS

---

## 🚀 Quick Start

### Prerequisites
- Node.js v20.11.0+
- PostgreSQL database
- SSH access to a VPS (for testing)

### Installation

```bash
# Clone the repository
cd ai-devops-guardian

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env and set your DATABASE_URL

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Start development server
npm run dev
```

Visit: **http://localhost:3000**

---

## 📁 Project Structure

```
ai-devops-guardian/
├── prisma/
│   └── schema.prisma              # Database schema (6 models)
├── src/
│   ├── agents/
│   │   ├── devops/                # DevOps Agent
│   │   └── security/              # Guardian Filter
│   ├── tools/
│   │   ├── ssh/                   # SSH manager
│   │   └── docker/                # Docker templates
│   ├── lib/
│   │   ├── prisma.ts              # Prisma client
│   │   └── socket.ts              # Socket.io server
│   ├── store/                     # Zustand stores
│   ├── types/                     # TypeScript types
│   └── app/
│       ├── api/                   # API routes
│       └── dashboard/             # Dashboard UI
└── .env.example
```

---

## 🔒 Security Guardian Filter

### Blocked Commands (CRITICAL - Risk 100)

```bash
rm -rf /                           # ❌ BLOCKED
dd if=/dev/zero of=/dev/sda        # ❌ BLOCKED
shutdown -h now                    # ❌ BLOCKED
:(){ :|:& };:                      # ❌ BLOCKED (fork bomb)
echo "cm0gLXJmIC8=" | base64 -d | bash  # ❌ BLOCKED (obfuscated)
```

### Allowed Commands (LOW Risk)

```bash
ls -la                             # ✅ ALLOWED
docker ps                          # ✅ ALLOWED
git status                         # ✅ ALLOWED
```

### Monitored Commands (MEDIUM Risk)

```bash
chmod 777 /tmp/file                # ⚠️ ALLOWED (logged)
npm install -g package             # ⚠️ ALLOWED (logged)
```

---

## 🎨 Dashboard UI

### Landing Page
- Feature showcase
- Animated gradient background
- System status indicators

### The War Room
- **Agent Status Panel**: Monitor all agents
- **Terminal**: Execute commands with live output
- **Security Alerts**: Real-time incident tracking
- **Recent Activity**: Activity feed

---

## 📊 Database Schema

6 models for complete infrastructure management:

1. **VPS**: Server connections (IP, SSH keys, status)
2. **Agent**: Multi-agent system (DevOps, Security, etc.)
3. **CommandHistory**: Audit trail with security validation
4. **AgentLog**: Real-time reasoning and execution logs
5. **Deployment**: Deployment tracking with progress
6. **SystemMetric**: Resource monitoring (CPU, RAM, disk)

---

## 🔌 API Endpoints

### Execute Command
```bash
POST /api/execute
{
  "command": "ls -la",
  "vpsId": "vps-id",
  "agentId": "devops-default"
}
```

### VPS Management
```bash
GET  /api/vps           # List all VPS
POST /api/vps           # Create VPS
```

### Agent Logs
```bash
GET /api/agents/:id/logs?limit=100&type=REASONING
```

---

## 🧪 Testing

### Test Security Filter

```bash
# Safe command
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la", "vpsId": "your-vps-id"}'

# Dangerous command (will be blocked)
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "rm -rf /", "vpsId": "your-vps-id"}'
```

---

## 🛠️ Development

### Add New Agent

1. Create agent file: `src/agents/[agent-name]/[agent-name].agent.ts`
2. Implement `IAgent` interface
3. Add to database: `AgentType` enum in Prisma schema
4. Register in API routes

### Add New Tool

1. Create tool file: `src/tools/[tool-name]/[tool-name].tool.ts`
2. Implement tool logic
3. Import in agent

---

## 📝 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_devops_guardian"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Socket.io
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"

# SSH Keys (optional)
SSH_KEYS_DIR="./ssh-keys"
```

---

## 🔜 Roadmap

### Phase 1 (Current) ✅
- [x] Prisma schema
- [x] Security Guardian Filter
- [x] DevOps Agent
- [x] API routes
- [x] Dashboard UI

### Phase 2 (Next)
- [ ] Backend Agent (API deployment)
- [ ] Frontend Agent (UI deployment)
- [ ] QA Agent (automated testing)
- [ ] Orchestrator Agent (multi-agent coordination)
- [ ] Approval workflow for HIGH-risk commands

### Phase 3 (Future)
- [ ] CI/CD pipeline integration
- [ ] Multi-user support
- [ ] Role-based access control
- [ ] Deployment rollback
- [ ] Advanced monitoring & alerting

---

## 🤝 Contributing

This is a personal project, but feedback is welcome!

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

Built with inspiration from:
- LangGraph.js (Multi-Agent orchestration)
- DevOps best practices
- Zero-trust security principles

---

## 📞 Contact

For questions or feedback, please open an issue.

---

**Built with ❤️ by QuocAnhPC**

**Status:** Phase 1 Complete 🎉
