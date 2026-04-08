import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { EnvironmentService } from '../../application/EnvironmentService.js';

const envService = new EnvironmentService();

export function useEnvironmentScan() {
  const snapshot = useAppStore(s => s.snapshot);
  const status = useAppStore(s => s.envScanStatus);
  const setSnapshot = useAppStore(s => s.setSnapshot);
  const setStatus = useAppStore(s => s.setEnvScanStatus);

  const scan = useCallback(async () => {
    setStatus('scanning');
    try {
      const result = await envService.scan();
      setSnapshot(result);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, [setSnapshot, setStatus]);

  useEffect(() => {
    if (status === 'idle') {
      scan();
    }
  }, []);

  return { snapshot, status, rescan: scan };
}
