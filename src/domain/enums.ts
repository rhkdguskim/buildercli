export type Severity = 'ok' | 'warning' | 'error' | 'unknown';

export type BuildSystem = 'dotnet' | 'msbuild' | 'cmake';

export type ProjectType =
  | 'dotnet-sdk'
  | 'dotnet-legacy'
  | 'cpp-msbuild'
  | 'cmake'
  | 'mixed';

export type BuildStatus = 'idle' | 'running' | 'success' | 'failure' | 'cancelled';

export type LogLevel = 'stdout' | 'stderr' | 'error' | 'warning' | 'info';

export type SdkType = 'dotnet-sdk' | 'dotnet-runtime' | 'windows-sdk' | 'msvc-toolset';

export type DiagnosticCategory = 'dotnet' | 'msbuild' | 'cpp' | 'cmake' | 'environment';

export type Verbosity = 'quiet' | 'minimal' | 'normal' | 'detailed' | 'diagnostic';
