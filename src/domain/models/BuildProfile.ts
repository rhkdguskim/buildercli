import type { BuildSystem, Verbosity } from '../enums.js';

export interface BuildProfile {
  id: string;
  name: string;
  targetPath: string;
  buildSystem: BuildSystem;
  configuration: string;
  platform: string;
  extraArguments: string[];
  useDeveloperShell: boolean;
  enableBinaryLog: boolean;
  verbosity: Verbosity;
}

export function createDefaultProfile(targetPath: string, buildSystem: BuildSystem): BuildProfile {
  return {
    id: crypto.randomUUID(),
    name: 'Default',
    targetPath,
    buildSystem,
    configuration: 'Debug',
    platform: 'x64',
    extraArguments: [],
    useDeveloperShell: buildSystem === 'msbuild',
    enableBinaryLog: false,
    verbosity: 'minimal',
  };
}
