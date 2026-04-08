import type { DiagnosticItem } from '../models/DiagnosticItem.js';
import type { EnvironmentSnapshot } from '../models/EnvironmentSnapshot.js';
import type { ProjectInfo } from '../models/ProjectInfo.js';

export function runDotnetRules(
  snapshot: EnvironmentSnapshot,
  projects: ProjectInfo[],
): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];
  const { dotnet } = snapshot;
  const dotnetProjects = projects.filter(p => p.projectType === 'dotnet-sdk' || p.projectType === 'dotnet-legacy');

  // Skip dotnet rules if no .NET projects found
  if (dotnetProjects.length === 0 && !dotnet.globalJsonPath) {
    if (!dotnet.tool.detected) {
      // Informational only when no .NET projects
      items.push({
        id: 'dotnet-not-installed',
        category: 'dotnet',
        severity: 'unknown',
        code: 'DIAG000',
        title: 'dotnet CLI not installed',
        description: 'The dotnet command is not available. No .NET projects were found so this may be intentional.',
        suggestedAction: 'Install .NET SDK if you plan to work with .NET projects',
        relatedPaths: [],
      });
    }
    return items;
  }

  // Critical: dotnet needed but missing
  if (!dotnet.tool.detected) {
    items.push({
      id: 'dotnet-missing',
      category: 'dotnet',
      severity: 'error',
      code: 'DIAG001',
      title: 'dotnet CLI not found',
      description: `The dotnet command is not available in PATH, but ${dotnetProjects.length} .NET project(s) were found.`,
      suggestedAction: 'Install .NET SDK from https://dotnet.microsoft.com/download',
      relatedPaths: dotnetProjects.map(p => p.filePath),
    });
    return items;
  }

  // global.json version mismatch
  if (dotnet.globalJsonPath && dotnet.globalJsonSdkVersion) {
    const required = dotnet.globalJsonSdkVersion;
    const exact = dotnet.sdks.find(s => s.version === required);
    const prefix = dotnet.sdks.find(s => s.version.startsWith(required));
    if (!exact && !prefix) {
      items.push({
        id: 'dotnet-globaljson-mismatch',
        category: 'dotnet',
        severity: 'error',
        code: 'DIAG002',
        title: `global.json requires SDK ${required}`,
        description: `global.json at ${dotnet.globalJsonPath} requires SDK version ${required}, which is not installed.\nInstalled SDKs: ${dotnet.sdks.map(s => s.version).join(', ') || 'none'}`,
        suggestedAction: `Run "dotnet sdk install ${required}" or update global.json to match an installed SDK`,
        relatedPaths: [dotnet.globalJsonPath],
      });
    }
  }

  // TFM compatibility
  const checkedTfms = new Set<string>();
  for (const proj of dotnetProjects) {
    for (const tfm of proj.targetFrameworks) {
      if (checkedTfms.has(tfm)) continue;
      checkedTfms.add(tfm);

      // Modern .NET (net6.0, net7.0, net8.0, net9.0)
      const modernMatch = tfm.match(/^net(\d+)\.(\d+)$/);
      if (modernMatch) {
        const major = modernMatch[1]!;
        const hasSdk = dotnet.sdks.some(s => s.version.startsWith(`${major}.`));
        if (!hasSdk) {
          const affectedProjects = dotnetProjects.filter(p => p.targetFrameworks.includes(tfm));
          items.push({
            id: `dotnet-tfm-${tfm}`,
            category: 'dotnet',
            severity: 'error',
            code: 'DIAG003',
            title: `No SDK for ${tfm}`,
            description: `${affectedProjects.length} project(s) target ${tfm} but no .NET ${major} SDK is installed.\nProjects: ${affectedProjects.map(p => p.name).join(', ')}`,
            suggestedAction: `Install .NET ${major} SDK from https://dotnet.microsoft.com/download/dotnet/${major}.0`,
            relatedPaths: affectedProjects.map(p => p.filePath),
          });
        }
        continue;
      }

      // .NET Framework (net48, net472, net461, etc.)
      const fwMatch = tfm.match(/^net(\d)(\d+)$/);
      if (fwMatch) {
        // .NET Framework requires MSBuild, not dotnet CLI
        const affectedProjects = dotnetProjects.filter(p => p.targetFrameworks.includes(tfm));
        const needsMsBuild = affectedProjects.some(p => p.projectType === 'dotnet-legacy');
        if (needsMsBuild && snapshot.msbuild.instances.length === 0) {
          items.push({
            id: `dotnet-fw-${tfm}`,
            category: 'dotnet',
            severity: 'error',
            code: 'DIAG004',
            title: `${tfm} requires MSBuild`,
            description: `.NET Framework ${tfm} projects require MSBuild (Visual Studio or Build Tools), not dotnet CLI.`,
            suggestedAction: 'Install Visual Studio Build Tools with .NET Framework targeting packs',
            relatedPaths: affectedProjects.map(p => p.filePath),
          });
        }
        continue;
      }

      // .NET Standard
      if (tfm.startsWith('netstandard')) {
        // .NET Standard is generally fine if any SDK is installed
        continue;
      }
    }
  }

  // Legacy projects using dotnet build recommendation
  const legacyProjects = dotnetProjects.filter(p => p.projectType === 'dotnet-legacy');
  if (legacyProjects.length > 0) {
    items.push({
      id: 'dotnet-legacy-projects',
      category: 'dotnet',
      severity: 'warning',
      code: 'DIAG005',
      title: `${legacyProjects.length} legacy .NET project(s) found`,
      description: `These projects use the old-style project format (non-SDK). They require MSBuild instead of dotnet CLI.\nProjects: ${legacyProjects.map(p => p.name).join(', ')}`,
      suggestedAction: 'Use MSBuild to build these projects, or consider migrating to SDK-style format',
      relatedPaths: legacyProjects.map(p => p.filePath),
    });
  }

  // Workload warnings for WPF/WinForms/MAUI
  const wpfProjects = dotnetProjects.filter(p => p.riskFlags.includes('WPF'));
  const winFormsProjects = dotnetProjects.filter(p => p.riskFlags.includes('WinForms'));
  if ((wpfProjects.length > 0 || winFormsProjects.length > 0) && process.platform !== 'win32') {
    items.push({
      id: 'dotnet-desktop-non-windows',
      category: 'dotnet',
      severity: 'error',
      code: 'DIAG006',
      title: 'WPF/WinForms projects on non-Windows platform',
      description: 'WPF and Windows Forms projects can only be built on Windows.',
      suggestedAction: 'Build these projects on a Windows machine',
      relatedPaths: [...wpfProjects, ...winFormsProjects].map(p => p.filePath),
    });
  }

  return items;
}
