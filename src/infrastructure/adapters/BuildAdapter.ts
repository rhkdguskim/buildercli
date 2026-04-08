import type { BuildSystem } from '../../domain/enums.js';
import type { BuildProfile } from '../../domain/models/BuildProfile.js';
import type { ProjectInfo } from '../../domain/models/ProjectInfo.js';

export interface ResolvedCommand {
  command: string;
  args: string[];
  requiresDevShell: boolean;
  displayString: string;  // human-readable preview
}

export interface BuildAdapter {
  readonly buildSystem: BuildSystem;
  canHandle(project: ProjectInfo): boolean;
  resolveCommand(project: ProjectInfo, profile: BuildProfile): ResolvedCommand;
}
