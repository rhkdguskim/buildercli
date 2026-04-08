import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { ProjectScanService } from '../../application/ProjectScanService.js';

const projectService = new ProjectScanService();

export function useProjectScan() {
  const projects = useAppStore(s => s.projects);
  const solutions = useAppStore(s => s.solutions);
  const status = useAppStore(s => s.projectScanStatus);
  const setProjects = useAppStore(s => s.setProjects);
  const setStatus = useAppStore(s => s.setProjectScanStatus);
  const envStatus = useAppStore(s => s.envScanStatus);

  const scan = useCallback(async (directory?: string) => {
    setStatus('scanning');
    try {
      const result = await projectService.scan(directory ?? process.cwd());
      setProjects(result.projects, result.solutions);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, [setProjects, setStatus]);

  // Auto-scan when environment scan completes
  useEffect(() => {
    if (envStatus === 'done' && status === 'idle') {
      scan();
    }
  }, [envStatus]);

  return { projects, solutions, status, scan };
}
