import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { ProjectInfo, BuildConfiguration } from '../../domain/models/ProjectInfo.js';
import type { ProjectType, BuildSystem } from '../../domain/enums.js';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['PropertyGroup', 'ItemGroup', 'PackageReference', 'ProjectReference'].includes(name),
});

export class ProjectFileParser {
  parseCsproj(filePath: string, solutionPath: string | null = null): ProjectInfo {
    const content = readFileSync(filePath, 'utf-8');
    const xml = xmlParser.parse(content);
    const project = xml.Project ?? xml.project ?? {};

    const isSdkStyle = !!project['@_Sdk'];
    const props = this.mergePropertyGroups(project.PropertyGroup);

    const targetFramework = props['TargetFramework'] ?? props['TargetFrameworks'] ?? '';
    const targetFrameworks = targetFramework.includes(';')
      ? targetFramework.split(';').map((s: string) => s.trim()).filter(Boolean)
      : targetFramework ? [targetFramework] : [];

    const platformTarget = props['PlatformTarget'] ?? props['Platform'] ?? '';
    const platformTargets = platformTarget ? [platformTarget] : ['AnyCPU'];

    const riskFlags: string[] = [];
    if (!isSdkStyle) riskFlags.push('legacy-format');
    if (props['UseWPF'] === 'true') riskFlags.push('WPF');
    if (props['UseWindowsForms'] === 'true') riskFlags.push('WinForms');

    const isTestProject =
      props['IsTestProject'] === 'true' ||
      this.hasPackageReference(project, 'Microsoft.NET.Test.Sdk') ||
      this.hasPackageReference(project, 'xunit') ||
      this.hasPackageReference(project, 'NUnit') ||
      this.hasPackageReference(project, 'MSTest.TestFramework');

    const projectType: ProjectType = isSdkStyle ? 'dotnet-sdk' : 'dotnet-legacy';
    const buildSystem: BuildSystem = isSdkStyle ? 'dotnet' : 'msbuild';

    // Extract configurations from PropertyGroup Conditions or defaults
    const configurations = this.extractConfigurations(project, isSdkStyle);

    return {
      name: basename(filePath, '.csproj'),
      filePath,
      projectType,
      language: 'csharp',
      buildSystem,
      targetFrameworks,
      platformTargets,
      configurations,
      platformToolset: null,
      windowsSdkVersion: null,
      recommendedCommand: isSdkStyle ? 'dotnet build' : 'msbuild',
      dependencies: this.extractPackageReferences(project),
      riskFlags: isTestProject ? [...riskFlags, 'test-project'] : riskFlags,
      solutionPath,
    };
  }

  parseFsproj(filePath: string, solutionPath: string | null = null): ProjectInfo {
    // F# projects follow same structure as C#
    const info = this.parseCsproj(filePath, solutionPath);
    return { ...info, name: basename(filePath, '.fsproj'), language: 'fsharp' };
  }

  parseVbproj(filePath: string, solutionPath: string | null = null): ProjectInfo {
    const info = this.parseCsproj(filePath, solutionPath);
    return { ...info, name: basename(filePath, '.vbproj'), language: 'vb' };
  }

  parseVcxproj(filePath: string, solutionPath: string | null = null): ProjectInfo {
    const content = readFileSync(filePath, 'utf-8');
    const xml = xmlParser.parse(content);
    const project = xml.Project ?? xml.project ?? {};
    const props = this.mergePropertyGroups(project.PropertyGroup);

    const platformToolset = props['PlatformToolset'] ?? null;
    const windowsSdkVersion = props['WindowsTargetPlatformVersion'] ?? null;
    const characterSet = props['CharacterSet'] ?? null;
    const clrSupport = props['CLRSupport'] ?? props['ManagedExtensions'] ?? null;

    // Extract configurations/platforms from ItemGroup > ProjectConfiguration
    const platforms = new Set<string>();
    const configurations: BuildConfiguration[] = [];
    const itemGroups = project.ItemGroup ?? [];
    for (const ig of (Array.isArray(itemGroups) ? itemGroups : [itemGroups])) {
      const configs = ig?.ProjectConfiguration;
      if (configs) {
        const configList = Array.isArray(configs) ? configs : [configs];
        for (const c of configList) {
          const include = c['@_Include'] as string | undefined;
          if (include && include.includes('|')) {
            const [config, plat] = include.split('|');
            if (config && plat) {
              platforms.add(plat);
              configurations.push({ configuration: config, platform: plat });
            }
          }
        }
      }
    }

    // Default configs if none found
    if (configurations.length === 0) {
      configurations.push(
        { configuration: 'Debug', platform: 'x64' },
        { configuration: 'Release', platform: 'x64' },
      );
    }

    const riskFlags: string[] = [];
    if (clrSupport) riskFlags.push(`CLR:${clrSupport}`);
    if (characterSet) riskFlags.push(`CharSet:${characterSet}`);

    return {
      name: basename(filePath, '.vcxproj'),
      filePath,
      projectType: 'cpp-msbuild',
      language: 'cpp',
      buildSystem: 'msbuild',
      targetFrameworks: [],
      platformTargets: platforms.size > 0 ? [...platforms] : ['x64'],
      configurations,
      platformToolset,
      windowsSdkVersion,
      recommendedCommand: 'msbuild',
      dependencies: this.extractPackageReferences(project),
      riskFlags,
      solutionPath,
    };
  }

  parseCMakeLists(filePath: string): ProjectInfo {
    const content = readFileSync(filePath, 'utf-8');

    // Extract project name
    const projectMatch = content.match(/project\s*\(\s*(\S+)/i);
    const name = projectMatch?.[1] ?? basename(filePath);

    // Extract cmake_minimum_required
    const minVersionMatch = content.match(/cmake_minimum_required\s*\(\s*VERSION\s+(\S+)/i);
    const riskFlags: string[] = [];
    if (minVersionMatch?.[1]) riskFlags.push(`cmake>=${minVersionMatch[1]}`);

    return {
      name,
      filePath,
      projectType: 'cmake',
      language: 'cpp',
      buildSystem: 'cmake',
      targetFrameworks: [],
      platformTargets: ['x64'],
      configurations: [
        { configuration: 'Debug', platform: 'x64' },
        { configuration: 'Release', platform: 'x64' },
      ],
      platformToolset: null,
      windowsSdkVersion: null,
      recommendedCommand: 'cmake --build',
      dependencies: [],
      riskFlags,
      solutionPath: null,
    };
  }

  private mergePropertyGroups(groups: unknown): Record<string, string> {
    const result: Record<string, string> = {};
    if (!groups) return result;
    const arr = Array.isArray(groups) ? groups : [groups];
    for (const g of arr) {
      if (typeof g === 'object' && g !== null) {
        for (const [key, value] of Object.entries(g)) {
          if (key.startsWith('@_')) continue;
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            result[key] = String(value);
          }
        }
      }
    }
    return result;
  }

  private extractPackageReferences(project: Record<string, unknown>): string[] {
    const refs: string[] = [];
    const itemGroups = project['ItemGroup'];
    if (!itemGroups) return refs;
    const groups = Array.isArray(itemGroups) ? itemGroups : [itemGroups];
    for (const ig of groups) {
      const pkgRefs = (ig as Record<string, unknown>)?.['PackageReference'];
      if (!pkgRefs) continue;
      const list = Array.isArray(pkgRefs) ? pkgRefs : [pkgRefs];
      for (const ref of list) {
        const id = (ref as Record<string, string>)?.['@_Include'];
        if (id) refs.push(id);
      }
    }
    return refs;
  }

  private hasPackageReference(project: Record<string, unknown>, packageId: string): boolean {
    return this.extractPackageReferences(project).some(
      id => id.toLowerCase() === packageId.toLowerCase(),
    );
  }

  /**
   * Extract Configuration|Platform pairs from PropertyGroup Conditions.
   * SDK-style: PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Debug|AnyCPU'"
   * Legacy: same pattern
   */
  private extractConfigurations(project: Record<string, unknown>, isSdkStyle: boolean): BuildConfiguration[] {
    const configs: BuildConfiguration[] = [];
    const seen = new Set<string>();
    const groups = project['PropertyGroup'];
    if (groups) {
      const arr = Array.isArray(groups) ? groups : [groups];
      for (const g of arr) {
        if (typeof g !== 'object' || g === null) continue;
        const condition = (g as Record<string, unknown>)['@_Condition'] as string | undefined;
        if (!condition) continue;
        // Match: '$(Configuration)|$(Platform)'=='Debug|AnyCPU'
        const match = condition.match(/'\$\(Configuration\)\|\$\(Platform\)'\s*==\s*'([^|]+)\|([^']+)'/);
        if (match) {
          const key = `${match[1]}|${match[2]}`;
          if (!seen.has(key)) {
            seen.add(key);
            configs.push({ configuration: match[1]!, platform: match[2]! });
          }
        }
      }
    }

    // Defaults if none found
    if (configs.length === 0) {
      if (isSdkStyle) {
        configs.push(
          { configuration: 'Debug', platform: 'Any CPU' },
          { configuration: 'Release', platform: 'Any CPU' },
        );
      } else {
        configs.push(
          { configuration: 'Debug', platform: 'Any CPU' },
          { configuration: 'Release', platform: 'Any CPU' },
        );
      }
    }

    return configs;
  }
}
