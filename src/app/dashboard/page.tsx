'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────
type AgentRole = 'devops' | 'backend' | 'qa' | 'ux' | 'security' | 'orchestrator';
type ModelProvider = 'CLAUDE' | 'GEMINI' | 'DEEPSEEK' | 'GPT4O' | 'OLLAMA';
type AgentStatus = 'IDLE' | 'THINKING' | 'EXECUTING' | 'WAITING' | 'ERROR';
type TaskStatus = 'PENDING' | 'THINKING' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'WAITING_APPROVAL';

interface AgentInfo {
    id: string;
    name: string;
    role: AgentRole;
    status: AgentStatus;
    provider: ModelProvider;
    capabilities: string[];
    active: boolean;
}

interface Task {
    id: string;
    userRequest: string;
    status: TaskStatus;
    assignedRole?: string;
    summary?: string;
    results: string[];
    createdAt: string;
}

interface LogEntry {
    id: string;
    agentId: string;
    roleName: string;
    message: string;
    type: string;
    timestamp: string;
}

// ── Config ────────────────────────────────────────────────────────────────────
const MODEL_PROVIDERS: { value: ModelProvider; label: string; color: string }[] = [
    { value: 'CLAUDE', label: 'Claude (Anthropic)', color: '#d97706' },
    { value: 'GEMINI', label: 'Gemini (Google)', color: '#2563eb' },
    { value: 'DEEPSEEK', label: 'DeepSeek', color: '#7c3aed' },
    { value: 'GPT4O', label: 'GPT-4o (OpenAI)', color: '#16a34a' },
    { value: 'OLLAMA', label: 'Ollama (Local)', color: '#6b7280' },
];

const AGENT_CONFIG: Omit<AgentInfo, 'id' | 'status' | 'provider'>[] = [
    { name: 'DevOps Senior', role: 'devops', capabilities: ['SSH', 'Docker', 'Deploy', 'Nginx'], active: true },
    { name: 'Backend Senior', role: 'backend', capabilities: ['API', 'Prisma', 'Zod', 'Auth'], active: true },
    { name: 'QA Senior', role: 'qa', capabilities: ['Vitest', 'Playwright', 'Bug Report'], active: true },
    { name: 'UX Senior', role: 'ux', capabilities: ['React', 'Tailwind', 'A11y', 'Motion'], active: true },
    { name: 'Security Guardian', role: 'security', capabilities: ['Risk Scoring', 'Obfuscation', 'Audit'], active: true },
    { name: 'Orchestrator', role: 'orchestrator', capabilities: ['Routing', 'Coordination'], active: true },
];

const ROLE_ICONS: Record<AgentRole, string> = {
    devops: '⚙️', backend: '🛠️', qa: '🧪', ux: '🎨', security: '🛡️', orchestrator: '🧠',
};

const ROLE_COLORS: Record<AgentRole, string> = {
    devops: 'text-green-400 border-green-500/40',
    backend: 'text-blue-400 border-blue-500/40',
    qa: 'text-yellow-400 border-yellow-500/40',
    ux: 'text-purple-400 border-purple-500/40',
    security: 'text-red-400 border-red-500/40',
    orchestrator: 'text-cyan-400 border-cyan-500/40',
};

const STATUS_COLORS: Record<AgentStatus, string> = {
    IDLE: 'bg-gray-500', THINKING: 'bg-yellow-400', EXECUTING: 'bg-blue-500',
    WAITING: 'bg-purple-500', ERROR: 'bg-red-500',
};

const TASK_STATUS_BADGE: Record<TaskStatus, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-gray-700 text-gray-300' },
    THINKING: { label: 'Thinking…', cls: 'bg-yellow-900/60 text-yellow-400' },
    EXECUTING: { label: 'Executing…', cls: 'bg-blue-900/60 text-blue-400 animate-pulse' },
    SUCCESS: { label: 'Done ✓', cls: 'bg-green-900/60 text-green-400' },
    FAILED: { label: 'Failed ✗', cls: 'bg-red-900/60 text-red-400' },
    WAITING_APPROVAL: { label: 'Needs Approval', cls: 'bg-orange-900/60 text-orange-400' },
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [agents, setAgents] = useState<AgentInfo[]>(
        AGENT_CONFIG.map((a, i) => ({
            ...a,
            id: `agent-${i}`,
            status: 'IDLE',
            provider: 'CLAUDE',
        }))
    );
    const [tasks, setTasks] = useState<Task[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [taskInput, setTaskInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'team' | 'tasks' | 'logs'>('team');
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Load tasks
    useEffect(() => {
        fetch('/api/tasks')
            .then(r => r.json())
            .then(d => setTasks(d.tasks ?? []))
            .catch(() => { });
    }, []);

    const handleSubmitTask = async () => {
        if (!taskInput.trim() || isSubmitting) return;
        setIsSubmitting(true);
        const request = taskInput;
        setTaskInput('');

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userRequest: request }),
            });
            const data = await res.json();
            if (data.taskId) {
                setTasks(prev => [{
                    id: data.taskId,
                    userRequest: request,
                    status: 'PENDING',
                    results: [],
                    createdAt: new Date().toISOString(),
                }, ...prev]);
                setActiveTab('tasks');

                // Simulate log entry
                addLog('orchestrator', `🎯 Task submitted: ${request.slice(0, 60)}…`, 'INFO');
            }
        } catch (err) {
            addLog('orchestrator', `❌ Failed to submit task`, 'ERROR');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleModelSwitch = async (agentId: string, provider: ModelProvider) => {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, provider } : a));
        try {
            await fetch(`/api/agents/${agentId}/model`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider }),
            });
            addLog(agentId, `🔄 Switched model to ${provider}`, 'INFO');
        } catch {
            addLog(agentId, `❌ Failed to switch model`, 'ERROR');
        }
    };

    const addLog = (roleName: string, message: string, type: string) => {
        setLogs(prev => [...prev.slice(-199), {
            id: Math.random().toString(36),
            agentId: roleName,
            roleName,
            message,
            type,
            timestamp: new Date().toISOString(),
        }]);
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            {/* ── Header ── */}
            <header className="border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🛡️</span>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">AI DevOps Guardian</h1>
                            <p className="text-xs text-gray-500">Multi-Agent Team · Phase 2</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-gray-400">System Online</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* ── Task Input ── */}
                <div className="bg-gray-900/60 border border-cyan-500/30 rounded-xl p-5"
                    style={{ boxShadow: '0 0 20px rgba(6,182,212,0.06)' }}>
                    <h2 className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-widest">Submit Task to AI Team</h2>
                    <div className="flex gap-3">
                        <input
                            id="task-input"
                            type="text"
                            value={taskInput}
                            onChange={e => setTaskInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmitTask()}
                            placeholder="e.g. 'Deploy the API to production VPS' or 'Write Playwright tests for login flow'"
                            className="flex-1 bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                        />
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleSubmitTask}
                            disabled={isSubmitting || !taskInput.trim()}
                            id="submit-task-btn"
                            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                            {isSubmitting ? <span className="animate-spin">⟳</span> : '▶'}
                            {isSubmitting ? 'Routing…' : 'Run'}
                        </motion.button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                        Orchestrator will route your task to the best agent. Model switches affect future tasks.
                    </p>
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-1 bg-gray-900/40 rounded-xl p-1 border border-gray-800">
                    {(['team', 'tasks', 'logs'] as const).map(tab => (
                        <button
                            key={tab}
                            id={`tab-${tab}`}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                    ? 'bg-gray-800 text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {tab === 'team' ? '👥 Team' : tab === 'tasks' ? '📋 Tasks' : '📡 Logs'}
                            {tab === 'tasks' && tasks.length > 0 && (
                                <span className="ml-2 bg-cyan-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                                    {tasks.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Team View ── */}
                <AnimatePresence mode="wait">
                    {activeTab === 'team' && (
                        <motion.div key="team" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {agents.map(agent => (
                                    <AgentCard
                                        key={agent.id}
                                        agent={agent}
                                        onModelSwitch={(provider) => handleModelSwitch(agent.id, provider)}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── Tasks View ── */}
                    {activeTab === 'tasks' && (
                        <motion.div key="tasks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-3">
                            {tasks.length === 0 ? (
                                <div className="text-center py-16 text-gray-600">
                                    <div className="text-4xl mb-3">📋</div>
                                    <p>No tasks yet. Submit a task above to get started.</p>
                                </div>
                            ) : (
                                tasks.map(task => <TaskCard key={task.id} task={task} />)
                            )}
                        </motion.div>
                    )}

                    {/* ── Logs View ── */}
                    {activeTab === 'logs' && (
                        <motion.div key="logs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
                                <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                                    <span className="text-xs font-mono text-gray-400">Agent Log Stream</span>
                                    <button onClick={() => setLogs([])} className="text-xs text-gray-600 hover:text-gray-400">Clear</button>
                                </div>
                                <div className="p-4 font-mono text-xs space-y-1 max-h-[500px] overflow-y-auto">
                                    {logs.length === 0 ? (
                                        <div className="text-gray-600">No logs yet. Submit a task to see agent reasoning here.</div>
                                    ) : (
                                        logs.map(log => <LogLine key={log.id} log={log} />)
                                    )}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

// ── Agent Card Component ──────────────────────────────────────────────────────
function AgentCard({ agent, onModelSwitch }: { agent: AgentInfo; onModelSwitch: (p: ModelProvider) => void }) {
    const colors = ROLE_COLORS[agent.role];
    const [colorText, colorBorder] = colors.split(' ');

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-gray-900/60 border ${colorBorder} rounded-xl p-5 space-y-4 hover:border-opacity-70 transition-all`}
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{ROLE_ICONS[agent.role]}</span>
                    <div>
                        <h3 className={`font-semibold text-sm ${colorText}`}>{agent.name}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{agent.role}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[agent.status]} ${agent.status !== 'IDLE' ? 'animate-pulse' : ''}`} />
                    <span className="text-xs text-gray-500">{agent.status}</span>
                </div>
            </div>

            {/* Capabilities */}
            <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map(cap => (
                    <span key={cap} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">
                        {cap}
                    </span>
                ))}
            </div>

            {/* Model Switcher */}
            <div>
                <label className="text-xs text-gray-500 block mb-1.5">LLM Provider</label>
                <select
                    id={`model-select-${agent.id}`}
                    value={agent.provider}
                    onChange={e => onModelSwitch(e.target.value as ModelProvider)}
                    className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-600 cursor-pointer"
                >
                    {MODEL_PROVIDERS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
            </div>
        </motion.div>
    );
}

// ── Task Card Component ───────────────────────────────────────────────────────
function TaskCard({ task }: { task: Task }) {
    const badge = TASK_STATUS_BADGE[task.status];
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-white flex-1 leading-relaxed">{task.userRequest}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>{badge.label}</span>
            </div>
            {task.assignedRole && (
                <p className="text-xs text-gray-500">
                    Handled by: <span className="text-cyan-400">{task.assignedRole}</span>
                    {task.summary && ` — ${task.summary}`}
                </p>
            )}
            {task.results.length > 0 && (
                <div>
                    <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                        {expanded ? '▲ Hide' : `▼ Show ${task.results.length} result(s)`}
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

// ── Log Line Component ────────────────────────────────────────────────────────
function LogLine({ log }: { log: LogEntry }) {
    const typeColors: Record<string, string> = {
        REASONING: 'text-yellow-400',
        EXECUTION: 'text-blue-400',
        SUCCESS: 'text-green-400',
        ERROR: 'text-red-400',
        SECURITY: 'text-orange-400',
        INFO: 'text-gray-400',
        WARN: 'text-yellow-300',
    };
    const color = typeColors[log.type] ?? 'text-gray-400';
    const time = new Date(log.timestamp).toLocaleTimeString();

    return (
        <div className="flex gap-2 items-start">
            <span className="text-gray-700 shrink-0">{time}</span>
            <span className="text-cyan-600 shrink-0">[{log.roleName}]</span>
            <span className={color}>{log.message}</span>
        </div>
    );
}
