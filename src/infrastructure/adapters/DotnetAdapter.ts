import type { BuildAdapter, ResolvedCommand } from './BuildAdapter.js';
import type { BuildProfile } from '../../domain/models/BuildProfile.js';
import type { ProjectInfo } from '../../domain/models/ProjectInfo.js';
import type { BuildSystem } from '../../domain/enums.js';

export class DotnetAdapter implements BuildAdapter {
  readonly buildSystem: BuildSystem = 'dotnet';

  canHandle(project: ProjectInfo): boolean {
    return project.buildSystem === 'dotnet';
  }

  resolveCommand(project: ProjectInfo, profile: BuildProfile): ResolvedCommand {
    const args: string[] = ['build'];

    // Target file
    args.push(`"${profile.targetPath}"`);

    // Configuration
    args.push('-c', profile.configuration);

    // Platform (only add if not default)
    if (profile.platform && profile.platform !== 'Any CPU' && profile.platform !== 'AnyCPU') {
      args.push(`/p:Platform="${profile.platform}"`);
    }

    // Verbosity
    args.push('-v', profile.verbosity);

    // Extra arguments
    args.push(...profile.extraArguments);

    // Binary log
    if (profile.enableBinaryLog) {
      args.push('-bl');
    }

    const displayString = `dotnet ${args.join(' ')}`;

    return {
      command: 'dotnet',
      args,
      requiresDevShell: false,
      displayString,
    };
  }
}
