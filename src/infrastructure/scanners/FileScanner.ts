import fg from 'fast-glob';
import { normalize } from 'node:path';

const PROJECT_PATTERNS = [
  '**/*.sln',
  '**/*.csproj',
  '**/*.fsproj',
  '**/*.vbproj',
  '**/*.vcxproj',
  '**/CMakeLists.txt',
  '**/global.json',
  '**/Directory.Build.props',
  '**/Directory.Packages.props',
  '**/NuGet.Config',
  '**/nuget.config',
  '**/packages.config',
  '**/vcpkg.json',
  '**/conanfile.txt',
  '**/conanfile.py',
];

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/bin/**',
  '**/obj/**',
  '**/.git/**',
  '**/packages/**',
  '**/TestResults/**',
  '**/.vs/**',
  '**/out/**',
  '**/build/**',
  '**/dist/**',
];

export interface ScannedFiles {
  solutions: string[];
  csharpProjects: string[];
  fsharpProjects: string[];
  vbProjects: string[];
  cppProjects: string[];
  cmakeFiles: string[];
  globalJson: string[];
  directoryBuildProps: string[];
  directoryPackagesProps: string[];
  nugetConfigs: string[];
  packagesConfigs: string[];
  vcpkgJson: string[];
  conanFiles: string[];
}

export class FileScanner {
  async scan(directory: string, maxDepth: number = 5): Promise<ScannedFiles> {
    const entries = await fg(PROJECT_PATTERNS, {
      cwd: directory,
      ignore: IGNORE_PATTERNS,
      deep: maxDepth,
      absolute: true,
      onlyFiles: true,
      caseSensitiveMatch: false,
      followSymbolicLinks: false,
    });

    const normalized = entries.map(e => normalize(e));

    return {
      solutions: normalized.filter(f => f.endsWith('.sln')),
      csharpProjects: normalized.filter(f => f.endsWith('.csproj')),
      fsharpProjects: normalized.filter(f => f.endsWith('.fsproj')),
      vbProjects: normalized.filter(f => f.endsWith('.vbproj')),
      cppProjects: normalized.filter(f => f.endsWith('.vcxproj')),
      cmakeFiles: normalized.filter(f => f.toLowerCase().endsWith('cmakelists.txt')),
      globalJson: normalized.filter(f => f.toLowerCase().endsWith('global.json')),
      directoryBuildProps: normalized.filter(f => f.toLowerCase().endsWith('directory.build.props')),
      directoryPackagesProps: normalized.filter(f => f.toLowerCase().endsWith('directory.packages.props')),
      nugetConfigs: normalized.filter(f => f.toLowerCase().endsWith('nuget.config')),
      packagesConfigs: normalized.filter(f => f.toLowerCase().endsWith('packages.config')),
      vcpkgJson: normalized.filter(f => f.toLowerCase().endsWith('vcpkg.json')),
      conanFiles: normalized.filter(f => /conanfile\.(txt|py)$/i.test(f)),
    };
  }
}
