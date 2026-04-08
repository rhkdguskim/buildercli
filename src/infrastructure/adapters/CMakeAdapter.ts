import type { BuildAdapter, ResolvedCommand } from './BuildAdapter.js';
import type { BuildProfile } from '../../domain/models/BuildProfile.js';
import type { ProjectInfo } from '../../domain/models/ProjectInfo.js';
import type { BuildSystem } from '../../domain/enums.js';
import { dirname } from 'node:path';

export class CMakeAdapter implements BuildAdapter {
  readonly buildSystem: BuildSystem = 'cmake';

  canHandle(project: ProjectInfo): boolean {
    return project.buildSystem === 'cmake';
  }

  resolveCommand(project: ProjectInfo, profile: BuildProfile): ResolvedCommand {
    const sourceDir = dirname(profile.targetPath);
    const buildDir = `${sourceDir}/build`;
    const args: string[] = [];

    args.push('--build', `"${buildDir}"`);
    args.push('--config', profile.configuration);

    if (profile.extraArguments.length > 0) {
      args.push('--', ...profile.extraArguments);
    }

    const displayString = `cmake ${args.join(' ')}`;

    return {
      command: 'cmake',
      args,
      requiresDevShell: false,
      displayString,
    };
  }
}
