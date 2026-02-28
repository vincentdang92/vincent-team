---
description: Rules - update progress.log after each task, read it at session start
---

# Rules for Every Session

## 🔁 Rule 1 — Start of Each Chat Session

At the very start of EVERY new chat session, BEFORE doing anything else:

```bash
cat /Users/dangquocanh/Desktop/AI/vincent-team/progress.log
```

Use this to understand what has been done, what is pending, and what the current focus is. Never assume context from memory alone.

## ✅ Rule 2 — After Completing Each Task

Immediately after completing any task (feature, fix, audit, refactor, etc.), append a new entry to `progress.log`:

```
[YYYY-MM-DD HH:MM +07] | ✅ DONE | <Task Name>
  → <What was done, files changed>
  → <Key outcomes or findings>
  → <Any blockers or next steps>
```

Use this command to append (replace with actual content):
```bash
cat >> /Users/dangquocanh/Desktop/AI/vincent-team/progress.log << 'EOF'

[2026-XX-XX HH:MM +07] | ✅ DONE | Task Name
  → What was done
  → Key outcomes
EOF
```

## 📝 Status Prefixes

| Prefix | Meaning |
|---|---|
| `✅ DONE` | Task fully completed |
| `🔄 IN PROGRESS` | Started but not finished |
| `⏸️ BLOCKED` | Waiting on something |
| `❌ CANCELLED` | Dropped |

## 📄 Format

File location: `/Users/dangquocanh/Desktop/AI/vincent-team/progress.log`
