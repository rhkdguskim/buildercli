import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { BuildService } from '../../application/BuildService.js';
import type { BuildProfile } from '../../domain/models/BuildProfile.js';
import type { BuildResult } from '../../domain/models/BuildResult.js';
import type { ProjectInfo } from '../../domain/models/ProjectInfo.js';
import type { BuildStatus } from '../../domain/enums.js';
import type { LogEntry } from '../../domain/models/LogEntry.js';

export function useBuild() {
  const snapshot = useAppStore(s => s.snapshot);
  const setBuildResult = useAppStore(s => s.setBuildResult);
  const addBuildHistory = useAppStore(s => s.addBuildHistory);
  const appendLogEntries = useAppStore(s => s.appendLogEntries);
  const clearLogs = useAppStore(s => s.clearLogs);

  const [status, setStatus] = useState<BuildStatus>('idle');
  const [result, setResult] = useState<BuildResult | null>(null);
  const serviceRef = useRef<BuildService | null>(null);

  // Batch log entries for performance (16ms debounce)
  const pendingEntries = useRef<LogEntry[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushLogs = useCallback(() => {
    if (pendingEntries.current.length > 0) {
      appendLogEntries([...pendingEntries.current]);
      pendingEntries.current = [];
    }
    flushTimer.current = null;
  }, [appendLogEntries]);

  const onLogEntry = useCallback((entry: LogEntry) => {
    pendingEntries.current.push(entry);
    if (!flushTimer.current) {
      flushTimer.current = setTimeout(flushLogs, 16);
    }
  }, [flushLogs]);

  const start = useCallback(async (project: ProjectInfo, profile: BuildProfile) => {
    if (!snapshot) return;

    clearLogs();
    setStatus('running');
    setResult(null);
    setBuildResult(null);

    const service = new BuildService(snapshot);
    serviceRef.current = service;

    try {
      const buildResult = await service.execute(project, profile, snapshot, onLogEntry);

      // Flush remaining logs
      flushLogs();

      setResult(buildResult);
      setBuildResult(buildResult);
      addBuildHistory(buildResult);
      setStatus(buildResult.status === 'success' ? 'success' : 'failure');
    } catch (err) {
      setStatus('failure');
    }
  }, [snapshot, clearLogs, setBuildResult, addBuildHistory, onLogEntry, flushLogs]);

  const cancel = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.cancel();
      setStatus('cancelled');
    }
  }, []);

  const resolveCommand = useCallback((project: ProjectInfo, profile: BuildProfile) => {
    if (!snapshot) return null;
    const service = new BuildService(snapshot);
    return service.resolveCommand(project, profile);
  }, [snapshot]);

  return { status, result, start, cancel, resolveCommand };
}
