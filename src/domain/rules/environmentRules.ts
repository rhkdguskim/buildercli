import type { DiagnosticItem } from '../models/DiagnosticItem.js';
import type { EnvironmentSnapshot } from '../models/EnvironmentSnapshot.js';

export function runEnvironmentRules(snapshot: EnvironmentSnapshot): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];

  // PATH pollution check: multiple dotnet or msbuild in PATH
  if (snapshot.dotnet.tool.path) {
    const pathDirs = (process.env['PATH'] ?? '').split(process.platform === 'win32' ? ';' : ':');
    const dotnetDirs = pathDirs.filter(d => {
      const lower = d.toLowerCase();
      return lower.includes('dotnet') && !lower.includes('dotnettools');
    });
    if (dotnetDirs.length > 1) {
      items.push({
        id: 'env-path-multi-dotnet',
        category: 'environment',
        severity: 'warning',
        code: 'DIAG040',
        title: 'Multiple dotnet locations in PATH',
        description: `Found ${dotnetDirs.length} directories containing dotnet in PATH. This may cause version conflicts.\nPaths: ${dotnetDirs.join(', ')}`,
        suggestedAction: 'Review PATH and remove duplicate dotnet entries',
        relatedPaths: dotnetDirs,
      });
    }
  }

  // Check if MSBuild is in PATH but no VS installed
  if (snapshot.msbuild.instances.length > 0 && snapshot.visualStudio.installations.length === 0) {
    items.push({
      id: 'env-msbuild-no-vs',
      category: 'environment',
      severity: 'warning',
      code: 'DIAG041',
      title: 'MSBuild found but no Visual Studio detected',
      description: 'MSBuild is available but vswhere did not find Visual Studio or Build Tools. Some features may be limited.',
      suggestedAction: 'Ensure Visual Studio Build Tools or full VS is installed properly',
      relatedPaths: [],
    });
  }

  // Check INCLUDE/LIB environment variables when C++ tools detected
  if (snapshot.cpp.clExe?.detected && !snapshot.cpp.vcEnvironmentActive) {
    const hasInclude = !!(process.env['INCLUDE'] && process.env['INCLUDE'].trim());
    const hasLib = !!(process.env['LIB'] && process.env['LIB'].trim());
    if (!hasInclude || !hasLib) {
      items.push({
        id: 'env-cpp-no-include-lib',
        category: 'environment',
        severity: 'warning',
        code: 'DIAG042',
        title: 'INCLUDE/LIB environment variables not set',
        description: 'C++ compiler is available but INCLUDE and LIB environment variables are not configured. Direct cl.exe invocation will fail without proper include paths.',
        suggestedAction: 'Run vcvarsall.bat or use Developer Command Prompt before building C++ projects',
        relatedPaths: snapshot.cpp.vcvarsPath ? [snapshot.cpp.vcvarsPath] : [],
      });
    }
  }

  // Check if git is missing (important for NuGet restore)
  if (!snapshot.git?.detected) {
    items.push({
      id: 'env-git-missing',
      category: 'environment',
      severity: 'warning',
      code: 'DIAG043',
      title: 'Git not found',
      description: 'Git is not available in PATH. Some NuGet packages and build tools require Git.',
      suggestedAction: 'Install Git from https://git-scm.com/',
      relatedPaths: [],
    });
  }

  return items;
}
