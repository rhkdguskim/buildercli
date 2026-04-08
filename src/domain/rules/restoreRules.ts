import type { DiagnosticItem } from '../models/DiagnosticItem.js';
import type { ProjectInfo } from '../models/ProjectInfo.js';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function runRestoreRules(projects: ProjectInfo[]): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];

  for (const proj of projects) {
    const projDir = dirname(proj.filePath);

    // Check for packages.config without packages folder (legacy .NET)
    if (proj.projectType === 'dotnet-legacy') {
      const packagesConfig = join(projDir, 'packages.config');
      if (existsSync(packagesConfig)) {
        // Check if solution-level packages folder exists
        const slnDir = proj.solutionPath ? dirname(proj.solutionPath) : projDir;
        const packagesDir = join(slnDir, 'packages');
        if (!existsSync(packagesDir)) {
          items.push({
            id: `restore-packages-${proj.name}`,
            category: 'dotnet',
            severity: 'warning',
            code: 'DIAG050',
            title: `NuGet restore needed for ${proj.name}`,
            description: `Project has packages.config but packages folder is missing. Run NuGet restore before building.`,
            suggestedAction: 'Run "nuget restore" or "msbuild /t:Restore" before building',
            relatedPaths: [packagesConfig],
          });
        }
      }
    }

    // Check for SDK-style project without obj folder (needs restore)
    if (proj.projectType === 'dotnet-sdk') {
      const objDir = join(projDir, 'obj');
      const projectAssets = join(objDir, 'project.assets.json');
      if (!existsSync(projectAssets)) {
        items.push({
          id: `restore-sdk-${proj.name}`,
          category: 'dotnet',
          severity: 'warning',
          code: 'DIAG051',
          title: `dotnet restore needed for ${proj.name}`,
          description: `No project.assets.json found. The project needs package restore before building.`,
          suggestedAction: 'Run "dotnet restore" before building',
          relatedPaths: [proj.filePath],
        });
      }
    }

    // Check vcpkg.json without vcpkg_installed (C++ projects)
    if (proj.projectType === 'cpp-msbuild') {
      const vcpkgJson = join(projDir, 'vcpkg.json');
      if (existsSync(vcpkgJson)) {
        const vcpkgInstalled = join(projDir, 'vcpkg_installed');
        if (!existsSync(vcpkgInstalled)) {
          items.push({
            id: `restore-vcpkg-${proj.name}`,
            category: 'cpp',
            severity: 'warning',
            code: 'DIAG052',
            title: `vcpkg install needed for ${proj.name}`,
            description: `vcpkg.json found but vcpkg_installed directory is missing.`,
            suggestedAction: 'Run "vcpkg install" or enable vcpkg manifest mode integration',
            relatedPaths: [vcpkgJson],
          });
        }
      }
    }
  }

  return items;
}
