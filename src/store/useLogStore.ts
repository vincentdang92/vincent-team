import { create } from 'zustand';
import { AgentLog } from '@prisma/client';

interface LogStore {
    logs: AgentLog[];
    addLog: (log: AgentLog) => void;
    clearLogs: () => void;
    setLogs: (logs: AgentLog[]) => void;
}

export const useLogStore = create<LogStore>((set) => ({
    logs: [],

    addLog: (log) =>
        set((state) => ({
            logs: [log, ...state.logs].slice(0, 1000), // Keep last 1000 logs
        })),

    clearLogs: () => set({ logs: [] }),

    setLogs: (logs) => set({ logs }),
}));
