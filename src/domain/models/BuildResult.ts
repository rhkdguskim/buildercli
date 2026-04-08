import type { BuildStatus } from '../enums.js';

export interface BuildDiagnostic {
  file: string;
  line: number | null;
  column: number | null;
  code: string;
  message: string;
  project: string;
  severity: 'error' | 'warning';
}

export interface BuildResult {
  profileId: string;
  startTime: Date;
  endTime: Date | null;
  durationMs: number;
  exitCode: number | null;
  status: BuildStatus;
  errorCount: number;
  warningCount: number;
  errors: BuildDiagnostic[];
  warnings: BuildDiagnostic[];
}
