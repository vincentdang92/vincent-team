'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STACK_LIBRARY, StackConfig, StackCategory, getStackOptions, DEFAULT_STACK } from '@/lib/stack-library';
import { formatStackSummary } from '@/lib/prompt-builder';

// ── Types ─────────────────────────────────────────────────────────────────────
type ModelProvider = 'CLAUDE' | 'GEMINI' | 'DEEPSEEK' | 'GPT4O' | 'OLLAMA';
type AgentRole = 'devops' | 'backend' | 'qa' | 'ux' | 'security' | 'orchestrator';
type AgentStatus = 'IDLE' | 'THINKING' | 'EXECUTING' | 'WAITING' | 'ERROR';
type TaskStatus = 'PENDING' | 'THINKING' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'WAITING_APPROVAL';

interface Project {
    id: string;
    name: string;
    description?: string | null;
    stack: StackConfig;
    createdAt: string;
}

interface AgentInfo {
    id: string;
    name: string;
    role: AgentRole;
    status: AgentStatus;
    provider: ModelProvider;
    capabilities: string[];
}

interface Task {
    id: string;
    userRequest: string;
    status: TaskStatus;
    assignedRole?: string;
    summary?: string;
    results: string[];
    createdAt: string;
    projectId?: string;
}

interface AgentSkill {
    id: string;
    name: string;
    description?: string | null;
    agentRole: string;
    content: string;
    sourceUrl?: string | null;
    sourceAuthor?: string | null;
    isActive: boolean;
    priority: number;
    createdAt: string;
}

interface LogEntry {
    id: string;
    roleName: string;
    message: string;
    type: string;
    timestamp: string;
}

// ── Config ────────────────────────────────────────────────────────────────────
const AGENTS: Omit<AgentInfo, 'status' | 'provider'>[] = [
    { id: 'devops', name: 'DevOps Senior', role: 'devops', capabilities: ['SSH', 'Docker', 'Deploy'] },
    { id: 'backend', name: 'Backend Senior', role: 'backend', capabilities: ['API', 'Database', 'Auth'] },
    { id: 'qa', name: 'QA Senior', role: 'qa', capabilities: ['Vitest', 'Playwright', 'Bugs'] },
    { id: 'ux', name: 'UX Senior', role: 'ux', capabilities: ['React', 'Tailwind', 'A11y'] },
    { id: 'security', name: 'Security Guardian', role: 'security', capabilities: ['Risk', 'Audit'] },
    { id: 'orchestrator', name: 'Orchestrator', role: 'orchestrator', capabilities: ['Routing', 'Planning'] },
];

const ROLE_ICONS: Record<AgentRole, string> = {
    devops: '⚙️', backend: '🛠️', qa: '🧪', ux: '🎨', security: '🛡️', orchestrator: '🧠',
};

const ROLE_COLORS: Record<AgentRole, { text: string; border: string; bg: string }> = {
    devops: { text: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10' },
    backend: { text: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
    qa: { text: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' },
    ux: { text: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
    security: { text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
    orchestrator: { text: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' },
};

const STACK_CATEGORY_ICONS: Record<StackCategory, string> = {
    frontend: '🖥️', backend: '⚙️', database: '🗄️', testing: '🧪', deploy: '🚀', mobile: '📱',
};

const STATUS_DOT: Record<AgentStatus, string> = {
    IDLE: 'bg-gray-500', THINKING: 'bg-yellow-400 animate-pulse',
    EXECUTING: 'bg-blue-400 animate-pulse', WAITING: 'bg-purple-500',
    ERROR: 'bg-red-500',
};

const TASK_BADGE: Record<TaskStatus, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-gray-700 text-gray-300' },
    THINKING: { label: 'Thinking…', cls: 'bg-yellow-900/60 text-yellow-400' },
    EXECUTING: { label: 'Executing…', cls: 'bg-blue-900/60 text-blue-400 animate-pulse' },
    SUCCESS: { label: '✓ Done', cls: 'bg-green-900/60 text-green-400' },
    FAILED: { label: '✗ Failed', cls: 'bg-red-900/60 text-red-400' },
    WAITING_APPROVAL: { label: 'Needs Approval', cls: 'bg-orange-900/60 text-orange-400' },
};

const MODEL_OPTIONS: { value: ModelProvider; label: string }[] = [
    { value: 'CLAUDE', label: 'Claude (Anthropic)' },
    { value: 'GEMINI', label: 'Gemini (Google)' },
    { value: 'DEEPSEEK', label: 'DeepSeek' },
    { value: 'GPT4O', label: 'GPT-4o (OpenAI)' },
    { value: 'OLLAMA', label: 'Ollama (Local)' },
];

const STACK_CATEGORIES: StackCategory[] = ['frontend', 'backend', 'database', 'testing', 'deploy', 'mobile'];

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [agents, setAgents] = useState<AgentInfo[]>(
        AGENTS.map(a => ({ ...a, status: 'IDLE', provider: 'CLAUDE' }))
    );
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [skills, setSkills] = useState<AgentSkill[]>([]);
    const [taskInput, setTaskInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'team' | 'tasks' | 'logs' | 'skills'>('team');
    const [showProjectWizard, setShowProjectWizard] = useState(false);
    // Skill form state
    const [skillForm, setSkillForm] = useState({
        name: '', description: '', agentRole: 'all', content: '', sourceUrl: '', priority: 0,
    });
    const [skillSaving, setSkillSaving] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

    // Load projects, tasks, and skills on mount
    useEffect(() => {
        fetch('/api/projects').then(r => r.json()).then(d => {
            const list = d.projects ?? [];
            setProjects(list);
            if (list.length > 0) setActiveProject(list[0]);
        }).catch(() => { });
        fetch('/api/tasks').then(r => r.json()).then(d => setTasks(d.tasks ?? [])).catch(() => { });
        fetch('/api/skills').then(r => r.json()).then(d => setSkills(d.skills ?? [])).catch(() => { });
    }, []);

    const addLog = useCallback((roleName: string, message: string, type = 'INFO') => {
        setLogs(prev => [...prev.slice(-199), {
            id: Math.random().toString(36), roleName, message, type,
            timestamp: new Date().toISOString(),
        }]);
    }, []);

    const handleSubmitTask = async () => {
        if (!taskInput.trim() || isSubmitting) return;
        setIsSubmitting(true);
        const req = taskInput;
        setTaskInput('');
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userRequest: req, projectId: activeProject?.id }),
            });
            const data = await res.json();
            if (data.taskId) {
                setTasks(prev => [{
                    id: data.taskId, userRequest: req, status: 'PENDING',
                    results: [], createdAt: new Date().toISOString(), projectId: activeProject?.id
                }, ...prev]);
                setActiveTab('tasks');
                addLog('orchestrator', `🎯 Task submitted${activeProject ? ` in [${activeProject.name}]` : ''}: ${req.slice(0, 60)}…`);
            }
        } catch { addLog('orchestrator', '❌ Failed to submit task', 'ERROR'); }
        finally { setIsSubmitting(false); }
    };

    const handleModelSwitch = async (agentId: string, provider: ModelProvider) => {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, provider } : a));
        try {
            await fetch(`/api/agents/${agentId}/model`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider }),
            });
            addLog(agentId, `🔄 Switched to ${provider}`);
        } catch { addLog(agentId, '❌ Model switch failed', 'ERROR'); }
    };

    const handleProjectCreated = (project: Project) => {
        setProjects(prev => [project, ...prev]);
        setActiveProject(project);
        setShowProjectWizard(false);
        addLog('orchestrator', `✅ Project "${project.name}" created — Stack: ${formatStackSummary(project.stack)}`);
    };

    const handleSaveSkill = async () => {
        if (!skillForm.name.trim() || !skillForm.content.trim()) return;
        setSkillSaving(true);
        try {
            const res = await fetch('/api/skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: skillForm.name.trim(),
                    description: skillForm.description.trim() || undefined,
                    agentRole: skillForm.agentRole,
                    content: skillForm.content,
                    sourceUrl: skillForm.sourceUrl.trim() || undefined,
                    priority: skillForm.priority,
                }),
            });
            const data = await res.json();
            if (data.skill) {
                setSkills(prev => [data.skill, ...prev]);
                setSkillForm({ name: '', description: '', agentRole: 'all', content: '', sourceUrl: '', priority: 0 });
                addLog('orchestrator', `🧠 Skill "${data.skill.name}" saved for [${data.skill.agentRole}] agent`);
            }
        } catch { addLog('orchestrator', '❌ Failed to save skill', 'ERROR'); }
        finally { setSkillSaving(false); }
    };

    const handleToggleSkill = async (skill: AgentSkill) => {
        try {
            const res = await fetch(`/api/skills/${skill.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !skill.isActive }),
            });
            const data = await res.json();
            if (data.skill) setSkills(prev => prev.map(s => s.id === skill.id ? data.skill : s));
        } catch { addLog('orchestrator', '❌ Failed to toggle skill', 'ERROR'); }
    };

    const handleDeleteSkill = async (skill: AgentSkill) => {
        try {
            await fetch(`/api/skills/${skill.id}`, { method: 'DELETE' });
            setSkills(prev => prev.filter(s => s.id !== skill.id));
            addLog('orchestrator', `🗑️ Skill "${skill.name}" deleted`);
        } catch { addLog('orchestrator', '❌ Failed to delete skill', 'ERROR'); }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            {/* ── Header ── */}
            <header className="sticky top-0 z-30 border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-sm px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🛡️</span>
                        <div>
                            <h1 className="text-lg font-bold text-white">AI DevOps Guardian</h1>
                            <p className="text-xs text-gray-500">Multi-Agent Team · Phase 4</p>
                        </div>
                    </div>

                    {/* Project Switcher */}
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                        <span className="text-xs text-gray-500 shrink-0">Project:</span>
                        <select
                            id="project-switcher"
                            value={activeProject?.id ?? ''}
                            onChange={e => {
                                const p = projects.find(p => p.id === e.target.value);
                                setActiveProject(p ?? null);
                            }}
                            className="flex-1 bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/60"
                        >
                            <option value="">— No project —</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <button
                            id="new-project-btn"
                            onClick={() => setShowProjectWizard(true)}
                            className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0"
                        >
                            + New
                        </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-gray-400">Online</span>
                    </div>
                </div>

                {/* Active project stack bar */}
                {activeProject && (
                    <div className="max-w-7xl mx-auto mt-2 flex gap-2 flex-wrap">
                        {STACK_CATEGORIES.map(cat => {
                            const key = activeProject.stack[cat];
                            if (!key) return null;
                            return (
                                <span key={cat}
                                    className="text-xs bg-gray-800/80 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span>{STACK_CATEGORY_ICONS[cat]}</span>
                                    <span className="text-gray-300">{key}</span>
                                </span>
                            );
                        })}
                    </div>
                )}
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* ── Task Input ── */}
                <div className="bg-gray-900/60 border border-cyan-500/20 rounded-xl p-5"
                    style={{ boxShadow: '0 0 24px rgba(6,182,212,0.05)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-widest">Submit Task</h2>
                        {activeProject && (
                            <span className="text-xs text-gray-500">
                                📦 <span className="text-gray-300">{activeProject.name}</span>
                                <span className="text-gray-600 ml-1">· {formatStackSummary(activeProject.stack)}</span>
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <input
                            id="task-input"
                            type="text"
                            value={taskInput}
                            onChange={e => setTaskInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmitTask()}
                            placeholder={activeProject
                                ? `e.g. "Create a /employees CRUD endpoint with ${activeProject.stack.backend ?? 'Express'}"`
                                : 'e.g. "Deploy the API to production VPS"'}
                            className="flex-1 bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
                        />
                        <motion.button
                            id="submit-task-btn"
                            whileTap={{ scale: 0.96 }}
                            onClick={handleSubmitTask}
                            disabled={isSubmitting || !taskInput.trim()}
                            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                        >
                            {isSubmitting ? '⟳' : '▶'} {isSubmitting ? 'Routing…' : 'Run'}
                        </motion.button>
                    </div>
                    {!activeProject && (
                        <p className="text-xs text-yellow-600 mt-2">
                            💡 Create a project first to give agents the right stack context.
                        </p>
                    )}
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-1 bg-gray-900/40 rounded-xl p-1 border border-gray-800">
                    {(['team', 'tasks', 'logs', 'skills'] as const).map(tab => (
                        <button key={tab} id={`tab-${tab}`} onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                                }`}>
                            {tab === 'team' ? '👥 Team'
                                : tab === 'tasks' ? `📋 Tasks${tasks.length > 0 ? ` (${tasks.length})` : ''}`
                                    : tab === 'logs' ? '📡 Logs'
                                        : `🧠 Skills${skills.length > 0 ? ` (${skills.length})` : ''}`}
                        </button>
                    ))}
                </div>

                {/* ── Tab Content ── */}
                <AnimatePresence mode="wait">
                    {activeTab === 'team' && (
                        <motion.div key="team" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {agents.map(agent => (
                                    <AgentCard
                                        key={agent.id}
                                        agent={agent}
                                        activeStack={activeProject?.stack}
                                        onModelSwitch={provider => handleModelSwitch(agent.id, provider)}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'tasks' && (
                        <motion.div key="tasks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-3">
                            {tasks.length === 0
                                ? <EmptyState icon="📋" text="No tasks yet. Submit a task above." />
                                : tasks.map(task => {
                                    const proj = projects.find(p => p.id === task.projectId);
                                    return <TaskCard key={task.id} task={task} projectName={proj?.name} />;
                                })
                            }
                        </motion.div>
                    )}

                    {activeTab === 'logs' && (
                        <motion.div key="logs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
                                <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                                    <span className="font-mono text-xs text-gray-400">Agent Log Stream</span>
                                    <button onClick={() => setLogs([])} className="text-xs text-gray-600 hover:text-gray-400">Clear</button>
                                </div>
                                <div className="p-4 font-mono text-xs space-y-1 max-h-[500px] overflow-y-auto">
                                    {logs.length === 0
                                        ? <div className="text-gray-600">No logs yet.</div>
                                        : logs.map(log => <LogLine key={log.id} log={log} />)
                                    }
                                    <div ref={logsEndRef} />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'skills' && (
                        <motion.div key="skills" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-5">

                            {/* ── Paste & Save Form ── */}
                            <div className="bg-gray-900/70 border border-purple-500/20 rounded-xl p-5 space-y-4"
                                style={{ boxShadow: '0 0 24px rgba(168,85,247,0.05)' }}>
                                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-widest">🧠 Install Skill</h3>
                                <p className="text-xs text-gray-500">Find skills on <a href="https://skillsmp.com/search" target="_blank" rel="noopener" className="text-purple-400 hover:underline">skillsmp.com</a> and paste the SKILL.md content below.</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Skill Name *</label>
                                        <input id="skill-name"
                                            value={skillForm.name}
                                            onChange={e => setSkillForm(p => ({ ...p, name: e.target.value }))}
                                            placeholder="e.g. TDD Master, Kubernetes Expert"
                                            className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500/60"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Assign to Agent</label>
                                        <select id="skill-role"
                                            value={skillForm.agentRole}
                                            onChange={e => setSkillForm(p => ({ ...p, agentRole: e.target.value }))}
                                            className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500/60"
                                        >
                                            <option value="all">🌐 All Agents</option>
                                            <option value="orchestrator">🧠 Orchestrator</option>
                                            <option value="devops">⚙️ DevOps</option>
                                            <option value="backend">🛠️ Backend</option>
                                            <option value="qa">🧪 QA</option>
                                            <option value="ux">🎨 UX / Frontend</option>
                                            <option value="security">🛡️ Security</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Description (optional)</label>
                                        <input
                                            value={skillForm.description}
                                            onChange={e => setSkillForm(p => ({ ...p, description: e.target.value }))}
                                            placeholder="Short description of what this skill teaches"
                                            className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500/60"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Source URL (optional)</label>
                                        <input
                                            value={skillForm.sourceUrl}
                                            onChange={e => setSkillForm(p => ({ ...p, sourceUrl: e.target.value }))}
                                            placeholder="https://skillsmp.com/skill/..."
                                            className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500/60"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Skill Content * (paste SKILL.md or custom instructions)</label>
                                    <textarea id="skill-content"
                                        value={skillForm.content}
                                        onChange={e => setSkillForm(p => ({ ...p, content: e.target.value }))}
                                        placeholder="Paste the full SKILL.md content here, or write custom expert instructions for the agent..."
                                        rows={8}
                                        className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500/60 font-mono resize-y"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Priority</label>
                                        <select value={skillForm.priority}
                                            onChange={e => setSkillForm(p => ({ ...p, priority: Number(e.target.value) }))}
                                            className="bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500/60"
                                        >
                                            <option value={0}>Normal (0)</option>
                                            <option value={50}>High (50)</option>
                                            <option value={100}>Critical (100)</option>
                                        </select>
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleSaveSkill}
                                        disabled={skillSaving || !skillForm.name.trim() || !skillForm.content.trim()}
                                        className="ml-auto bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        {skillSaving ? '⟳ Saving…' : '💾 Save Skill'}
                                    </motion.button>
                                </div>
                            </div>

                            {/* ── Saved Skills List ── */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest px-1">
                                    Installed Skills ({skills.length})
                                </h3>
                                {skills.length === 0 && (
                                    <div className="text-center py-12 text-gray-600 text-sm">
                                        No skills installed yet. Paste one above to train your team.
                                    </div>
                                )}
                                {skills.map(skill => (
                                    <motion.div key={skill.id}
                                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                        className={`bg-gray-900/60 border rounded-xl p-4 flex items-start justify-between gap-4 transition-all ${skill.isActive ? 'border-purple-500/30' : 'border-gray-800 opacity-50'
                                            }`}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-semibold text-white">{skill.name}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                                                    {skill.agentRole === 'all' ? '🌐 All' : `${ROLE_ICONS[skill.agentRole as AgentRole] ?? '🤖'} ${skill.agentRole}`}
                                                </span>
                                                {skill.priority > 0 && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-400">P{skill.priority}</span>
                                                )}
                                            </div>
                                            {skill.description && <p className="text-xs text-gray-500 mb-1">{skill.description}</p>}
                                            {skill.sourceUrl && (
                                                <a href={skill.sourceUrl} target="_blank" rel="noopener"
                                                    className="text-xs text-purple-400 hover:underline">{skill.sourceUrl}</a>
                                            )}
                                            <p className="text-xs text-gray-600 mt-1 font-mono">
                                                {skill.content.slice(0, 120)}{skill.content.length > 120 ? '…' : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleToggleSkill(skill)}
                                                className={`text-xs px-3 py-1 rounded-lg transition-colors ${skill.isActive
                                                        ? 'bg-purple-600/20 text-purple-400 hover:bg-red-600/20 hover:text-red-400'
                                                        : 'bg-gray-800 text-gray-500 hover:bg-purple-600/20 hover:text-purple-400'
                                                    }`}
                                            >
                                                {skill.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSkill(skill)}
                                                className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1"
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* ── Project Wizard Modal ── */}
            <AnimatePresence>
                {showProjectWizard && (
                    <ProjectWizard
                        onClose={() => setShowProjectWizard(false)}
                        onCreated={handleProjectCreated}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Agent Card ──────────────────────────────────────────────────────────────
function AgentCard({
    agent, activeStack, onModelSwitch
}: {
    agent: AgentInfo;
    activeStack?: StackConfig;
    onModelSwitch: (p: ModelProvider) => void;
}) {
    const c = ROLE_COLORS[agent.role];

    // Determine which stack key is relevant for this agent
    const stackHints: Partial<Record<AgentRole, StackCategory[]>> = {
        devops: ['deploy', 'database'],
        backend: ['backend', 'database'],
        qa: ['testing', 'mobile'],
        ux: ['frontend', 'mobile'],
        orchestrator: ['frontend', 'backend', 'database', 'mobile'],
    };
    const relevantCats = stackHints[agent.role] ?? [];
    const stackBadges = activeStack
        ? relevantCats.map(cat => activeStack[cat]).filter(Boolean) as string[]
        : [];

    return (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className={`bg-gray-900/60 border ${c.border} rounded-xl p-5 space-y-4 hover:border-opacity-60 transition-all`}>
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center text-xl`}>
                        {ROLE_ICONS[agent.role]}
                    </div>
                    <div>
                        <h3 className={`font-semibold text-sm ${c.text}`}>{agent.name}</h3>
                        <p className="text-xs text-gray-600 uppercase tracking-wider mt-0.5">{agent.role}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${STATUS_DOT[agent.status]}`} />
                    <span className="text-xs text-gray-500">{agent.status}</span>
                </div>
            </div>

            {/* Capabilities */}
            <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map(cap => (
                    <span key={cap} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700/60">
                        {cap}
                    </span>
                ))}
            </div>

            {/* Stack badges (from active project) */}
            {stackBadges.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                    {stackBadges.map(b => (
                        <span key={b} className={`text-xs ${c.bg} ${c.text} px-2 py-0.5 rounded-full border ${c.border}`}>
                            {b}
                        </span>
                    ))}
                </div>
            )}

            {/* Model Switcher */}
            <div>
                <label className="text-xs text-gray-500 block mb-1.5">LLM Provider</label>
                <select
                    id={`model-select-${agent.id}`}
                    value={agent.provider}
                    onChange={e => onModelSwitch(e.target.value as ModelProvider)}
                    className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none"
                >
                    {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
        </motion.div>
    );
}

// ── Project Wizard ────────────────────────────────────────────────────────────
function ProjectWizard({ onClose, onCreated }: {
    onClose: () => void;
    onCreated: (p: Project) => void;
}) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [stack, setStack] = useState<StackConfig>({ ...DEFAULT_STACK });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) { setError('Project name is required'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined, stack }),
            });
            const data = await res.json();
            if (data.project) onCreated(data.project);
            else setError(data.error ?? 'Failed to create project');
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">New Project</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl">×</button>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Project Name *</label>
                    <input
                        id="project-name-input"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Employee Dashboard"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60"
                    />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Description</label>
                    <input
                        type="text"
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Brief description (optional)"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60"
                    />
                </div>

                {/* Stack Pickers */}
                <div className="space-y-2">
                    <label className="text-xs text-gray-400 block">Tech Stack</label>
                    <div className="grid grid-cols-1 gap-2">
                        {STACK_CATEGORIES.map(cat => {
                            const opts = getStackOptions(cat);
                            return (
                                <div key={cat} className="flex items-center gap-3">
                                    <span className="text-sm w-6">{STACK_CATEGORY_ICONS[cat]}</span>
                                    <span className="text-xs text-gray-500 w-20 capitalize">{cat}</span>
                                    <select
                                        id={`stack-${cat}`}
                                        value={stack[cat] ?? ''}
                                        onChange={e => setStack(prev => ({ ...prev, [cat]: e.target.value || undefined }))}
                                        className="flex-1 bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-600"
                                    >
                                        <option value="">— None —</option>
                                        {opts.map(opt => (
                                            <option key={opt} value={opt}>
                                                {STACK_LIBRARY[cat][opt].label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Stack preview */}
                {(stack.frontend || stack.backend) && (
                    <p className="text-xs text-gray-500 bg-gray-800/50 rounded-lg px-3 py-2">
                        🔍 Agents will be prompted as experts in: <span className="text-gray-300">{formatStackSummary(stack)}</span>
                    </p>
                )}

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex gap-3">
                    <button onClick={onClose}
                        className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <motion.button
                        id="create-project-btn"
                        whileTap={{ scale: 0.97 }}
                        onClick={handleCreate}
                        disabled={loading || !name.trim()}
                        className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                    >
                        {loading ? 'Creating…' : 'Create Project'}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, projectName }: { task: Task; projectName?: string }) {
    const badge = TASK_BADGE[task.status];
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-white flex-1 leading-relaxed">{task.userRequest}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>{badge.label}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
                {projectName && <span className="text-cyan-600">📦 {projectName}</span>}
                {task.assignedRole && <span>→ <span className="text-gray-400">{task.assignedRole}</span></span>}
                {task.summary && <span className="text-gray-600 truncate">{task.summary}</span>}
            </div>
            {task.results.length > 0 && (
                <div>
                    <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                        {expanded ? '▲ Hide' : `▼ ${task.results.length} result(s)`}
                    </button>
                    <AnimatePresence>
                        {expanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="mt-2 bg-gray-800/50 rounded-lg p-3 font-mono text-xs text-gray-300 space-y-1 overflow-hidden max-h-40 overflow-y-auto">
                                {task.results.map((r, i) => <div key={i}>{r}</div>)}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
            <p className="text-xs text-gray-700">{new Date(task.createdAt).toLocaleString()}</p>
        </div>
    );
}

// ── Log Line ─────────────────────────────────────────────────────────────────
function LogLine({ log }: { log: LogEntry }) {
    const typeColors: Record<string, string> = {
        INFO: 'text-gray-400', SUCCESS: 'text-green-400', ERROR: 'text-red-400',
        WARN: 'text-yellow-300', REASONING: 'text-yellow-400', EXECUTION: 'text-blue-400',
        SECURITY: 'text-orange-400',
    };
    return (
        <div className="flex gap-2 items-start">
            <span className="text-gray-700 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className="text-cyan-700 shrink-0">[{log.roleName}]</span>
            <span className={typeColors[log.type] ?? 'text-gray-400'}>{log.message}</span>
        </div>
    );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ icon, text }: { icon: string; text: string }) {
    return (
        <div className="text-center py-16 text-gray-600">
            <div className="text-4xl mb-3">{icon}</div>
            <p>{text}</p>
        </div>
    );
}
