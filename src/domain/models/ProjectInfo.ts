import type { ProjectType, BuildSystem } from '../enums.js';

/** A Configuration|Platform pair from the solution/project configuration manager */
export interface BuildConfiguration {
  configuration: string;  // e.g., "Debug", "Release"
  platform: string;       // e.g., "x64", "Win32", "Any CPU", "ARM64"
}

export interface ProjectInfo {
  name: string;
  filePath: string;
  projectType: ProjectType;
  language: 'csharp' | 'cpp' | 'fsharp' | 'vb' | 'mixed' | 'unknown';
  buildSystem: BuildSystem;
  targetFrameworks: string[];
  platformTargets: string[];
  configurations: BuildConfiguration[];  // all Configuration|Platform pairs
  platformToolset: string | null;
  windowsSdkVersion: string | null;
  recommendedCommand: string;
  dependencies: string[];
  riskFlags: string[];
  solutionPath: string | null;
}

export interface SolutionInfo {
  name: string;
  filePath: string;
  projects: ProjectInfo[];
  solutionType: 'csharp' | 'cpp' | 'mixed';
  configurations: BuildConfiguration[];  // solution-level Configuration|Platform pairs
}
