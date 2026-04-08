import type { ToolInfo } from './ToolInfo.js';
import type { SdkInfo } from './SdkInfo.js';

export interface VsInstallation {
  instanceId: string;
  displayName: string;
  version: string;
  installPath: string;
  edition: string;
  hasMsBuild: boolean;
  hasVcTools: boolean;
  hasWindowsSdk: boolean;
}

export interface EnvironmentSnapshot {
  os: { name: string; version: string; arch: string };
  shell: string;
  cwd: string;
  gitBranch: string | null;
  hostname: string;
  username: string;

  dotnet: {
    tool: ToolInfo;
    sdks: SdkInfo[];
    runtimes: SdkInfo[];
    workloads: string[];
    globalJsonPath: string | null;
    globalJsonSdkVersion: string | null;
  };

  msbuild: {
    instances: ToolInfo[];
    selectedPath: string | null;
  };

  visualStudio: {
    installations: VsInstallation[];
  };

  cpp: {
    clExe: ToolInfo | null;
    linkExe: ToolInfo | null;
    libExe: ToolInfo | null;
    rcExe: ToolInfo | null;
    dumpbinExe: ToolInfo | null;
    toolsets: SdkInfo[];
    vcvarsPath: string | null;
    vcEnvironmentActive: boolean;
  };

  windowsSdk: {
    versions: SdkInfo[];
  };

  cmake: ToolInfo | null;
  ninja: ToolInfo | null;
  git: ToolInfo | null;

  packageManagers: {
    vcpkg: ToolInfo | null;
    nuget: ToolInfo | null;
    conan: ToolInfo | null;
  };

  powershell: ToolInfo | null;
}

export function createEmptySnapshot(): EnvironmentSnapshot {
  return {
    os: { name: '', version: '', arch: '' },
    shell: '',
    cwd: process.cwd(),
    gitBranch: null,
    hostname: '',
    username: '',
    dotnet: {
      tool: { name: 'dotnet', path: null, version: null, detected: false, source: 'unknown', architecture: null, notes: [] },
      sdks: [],
      runtimes: [],
      workloads: [],
      globalJsonPath: null,
      globalJsonSdkVersion: null,
    },
    msbuild: { instances: [], selectedPath: null },
    visualStudio: { installations: [] },
    cpp: {
      clExe: null, linkExe: null, libExe: null, rcExe: null, dumpbinExe: null,
      toolsets: [], vcvarsPath: null, vcEnvironmentActive: false,
    },
    windowsSdk: { versions: [] },
    cmake: null,
    ninja: null,
    git: null,
    packageManagers: { vcpkg: null, nuget: null, conan: null },
    powershell: null,
  };
}
