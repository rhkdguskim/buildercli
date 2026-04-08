import type { LogLevel } from '../enums.js';

export interface LogEntry {
  index: number;
  timestamp: number;
  level: LogLevel;
  text: string;
  source: 'stdout' | 'stderr';
}
