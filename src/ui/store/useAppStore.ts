import { create } from 'zustand';
import type { EnvironmentSnapshot } from '../../domain/models/EnvironmentSnapshot.js';
import type { ProjectInfo, SolutionInfo } from '../../domain/models/ProjectInfo.js';
import type { DiagnosticItem } from '../../domain/models/DiagnosticItem.js';
import type { BuildResult } from '../../domain/models/BuildResult.js';
import type { LogEntry } from '../../domain/models/LogEntry.js';

export type TabId = 'overview' | 'environment' | 'projects' | 'build' | 'diagnostics' | 'logs' | 'history' | 'settings';
export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

interface AppState {
  // Tab navigation
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // Environment scan
  snapshot: EnvironmentSnapshot | null;
  envScanStatus: ScanStatus;
  setSnapshot: (snapshot: EnvironmentSnapshot) => void;
  setEnvScanStatus: (status: ScanStatus) => void;

  // Project scan
  projects: ProjectInfo[];
  solutions: SolutionInfo[];
  projectScanStatus: ScanStatus;
  setProjects: (projects: ProjectInfo[], solutions: SolutionInfo[]) => void;
  setProjectScanStatus: (status: ScanStatus) => void;

  // Diagnostics
  diagnostics: DiagnosticItem[];
  setDiagnostics: (items: DiagnosticItem[]) => void;

  // Build
  buildResult: BuildResult | null;
  buildHistory: BuildResult[];
  setBuildResult: (result: BuildResult | null) => void;
  addBuildHistory: (result: BuildResult) => void;

  // Logs
  logEntries: LogEntry[];
  appendLogEntries: (entries: LogEntry[]) => void;
  clearLogs: () => void;
}

const MAX_LOG_ENTRIES = 50000;

export const useAppStore = create<AppState>((set) => ({
  // Tab
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Environment
  snapshot: null,
  envScanStatus: 'idle',
  setSnapshot: (snapshot) => set({ snapshot }),
  setEnvScanStatus: (status) => set({ envScanStatus: status }),

  // Projects
  projects: [],
  solutions: [],
  projectScanStatus: 'idle',
  setProjects: (projects, solutions) => set({ projects, solutions }),
  setProjectScanStatus: (status) => set({ projectScanStatus: status }),

  // Diagnostics
  diagnostics: [],
  setDiagnostics: (items) => set({ diagnostics: items }),

  // Build
  buildResult: null,
  buildHistory: [],
  setBuildResult: (result) => set({ buildResult: result }),
  addBuildHistory: (result) => set((state) => ({
    buildHistory: [...state.buildHistory, result].slice(-100),
  })),

  // Logs
  logEntries: [],
  appendLogEntries: (entries) => set((state) => {
    const combined = [...state.logEntries, ...entries];
    return { logEntries: combined.length > MAX_LOG_ENTRIES ? combined.slice(-MAX_LOG_ENTRIES) : combined };
  }),
  clearLogs: () => set({ logEntries: [] }),
}));
