import type { DiagnosticItem } from '../models/DiagnosticItem.js';
import type { EnvironmentSnapshot } from '../models/EnvironmentSnapshot.js';
import type { ProjectInfo } from '../models/ProjectInfo.js';

export function runCppRules(
  snapshot: EnvironmentSnapshot,
  projects: ProjectInfo[],
): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];
  const cppProjects = projects.filter(p => p.projectType === 'cpp-msbuild');

  if (cppProjects.length === 0) return items;

  if (!snapshot.cpp.clExe?.detected) {
    items.push({
      id: 'cpp-cl-missing',
      category: 'cpp',
      severity: 'error',
      code: 'DIAG020',
      title: 'cl.exe not found',
      description: 'C++ compiler (cl.exe) is not available.',
      suggestedAction: 'Install Visual Studio Build Tools with "C++ build tools" workload',
      relatedPaths: [],
    });
  }

  if (!snapshot.cpp.vcEnvironmentActive && snapshot.cpp.vcvarsPath) {
    items.push({
      id: 'cpp-vcvars-inactive',
      category: 'cpp',
      severity: 'warning',
      code: 'DIAG021',
      title: 'VC environment not activated',
      description: 'vcvarsall.bat has not been run in this session. C++ builds may need Developer Command Prompt.',
      suggestedAction: `Run vcvarsall.bat or use Developer Command Prompt. Path: ${snapshot.cpp.vcvarsPath}`,
      relatedPaths: [snapshot.cpp.vcvarsPath],
    });
  }

  if (snapshot.windowsSdk.versions.length === 0 && cppProjects.length > 0) {
    items.push({
      id: 'cpp-winsdk-missing',
      category: 'cpp',
      severity: 'error',
      code: 'DIAG022',
      title: 'Windows SDK not found',
      description: 'C++ projects require Windows SDK but none is installed.',
      suggestedAction: 'Install Windows SDK via Visual Studio Installer or standalone installer',
      relatedPaths: [],
    });
  }

  for (const proj of cppProjects) {
    if (proj.platformToolset) {
      const hasToolset = snapshot.cpp.toolsets.some(t => t.version.startsWith(proj.platformToolset!));
      if (!hasToolset) {
        items.push({
          id: `cpp-toolset-${proj.platformToolset}-${proj.name}`,
          category: 'cpp',
          severity: 'warning',
          code: 'DIAG023',
          title: `PlatformToolset ${proj.platformToolset} not found`,
          description: `Project ${proj.name} requires PlatformToolset ${proj.platformToolset}.`,
          suggestedAction: `Install MSVC ${proj.platformToolset} toolset via Visual Studio Installer`,
          relatedPaths: [proj.filePath],
        });
      }
    }

    if (proj.windowsSdkVersion) {
      const hasVersion = snapshot.windowsSdk.versions.some(v => v.version === proj.windowsSdkVersion);
      if (!hasVersion) {
        items.push({
          id: `cpp-winsdk-ver-${proj.windowsSdkVersion}-${proj.name}`,
          category: 'cpp',
          severity: 'warning',
          code: 'DIAG024',
          title: `Windows SDK ${proj.windowsSdkVersion} not found`,
          description: `Project ${proj.name} requires Windows SDK ${proj.windowsSdkVersion}.`,
          suggestedAction: `Install Windows SDK ${proj.windowsSdkVersion}`,
          relatedPaths: [proj.filePath],
        });
      }
    }
  }

  return items;
}
