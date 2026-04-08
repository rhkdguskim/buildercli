export interface ToolInfo {
  name: string;
  path: string | null;
  version: string | null;
  detected: boolean;
  source: string;
  architecture: 'x86' | 'x64' | 'arm64' | null;
  notes: string[];
}

export function createToolInfo(partial: Partial<ToolInfo> & { name: string }): ToolInfo {
  return {
    path: null,
    version: null,
    detected: false,
    source: 'unknown',
    architecture: null,
    notes: [],
    ...partial,
  };
}
