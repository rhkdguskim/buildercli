import type { DiagnosticItem } from '../models/DiagnosticItem.js';
import type { EnvironmentSnapshot } from '../models/EnvironmentSnapshot.js';
import type { ProjectInfo } from '../models/ProjectInfo.js';

export function runMsBuildRules(
  snapshot: EnvironmentSnapshot,
  projects: ProjectInfo[],
): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];

  const needsMsBuild = projects.some(
    p => p.buildSystem === 'msbuild' || p.projectType === 'dotnet-legacy',
  );

  if (needsMsBuild && snapshot.msbuild.instances.length === 0) {
    items.push({
      id: 'msbuild-missing',
      category: 'msbuild',
      severity: 'error',
      code: 'DIAG010',
      title: 'MSBuild not found',
      description: 'Projects require MSBuild but no instance was detected.',
      suggestedAction: 'Install Visual Studio or Build Tools with MSBuild component',
      relatedPaths: [],
    });
  }

  if (needsMsBuild && snapshot.visualStudio.installations.length === 0) {
    items.push({
      id: 'vs-missing',
      category: 'msbuild',
      severity: 'warning',
      code: 'DIAG011',
      title: 'Visual Studio / Build Tools not found',
      description: 'No Visual Studio or Build Tools installation detected via vswhere.',
      suggestedAction: 'Install Visual Studio Build Tools from https://visualstudio.microsoft.com/downloads/',
      relatedPaths: [],
    });
  }

  return items;
}
