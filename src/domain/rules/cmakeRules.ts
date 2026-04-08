import type { DiagnosticItem } from '../models/DiagnosticItem.js';
import type { EnvironmentSnapshot } from '../models/EnvironmentSnapshot.js';
import type { ProjectInfo } from '../models/ProjectInfo.js';

export function runCMakeRules(
  snapshot: EnvironmentSnapshot,
  projects: ProjectInfo[],
): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];
  const cmakeProjects = projects.filter(p => p.projectType === 'cmake');

  if (cmakeProjects.length === 0) return items;

  if (!snapshot.cmake?.detected) {
    items.push({
      id: 'cmake-missing',
      category: 'cmake',
      severity: 'error',
      code: 'DIAG030',
      title: 'CMake not found',
      description: 'CMakeLists.txt found but cmake is not available in PATH.',
      suggestedAction: 'Install CMake from https://cmake.org/download/ or via Visual Studio Installer',
      relatedPaths: cmakeProjects.map(p => p.filePath),
    });
  }

  if (!snapshot.ninja?.detected) {
    items.push({
      id: 'ninja-missing',
      category: 'cmake',
      severity: 'warning',
      code: 'DIAG031',
      title: 'Ninja not found',
      description: 'Ninja build system is not available. CMake will fall back to other generators.',
      suggestedAction: 'Install Ninja for faster builds: https://ninja-build.org/',
      relatedPaths: [],
    });
  }

  return items;
}
