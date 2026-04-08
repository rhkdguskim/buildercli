import { createEmptySnapshot, type EnvironmentSnapshot } from '../domain/models/EnvironmentSnapshot.js';
import { DotnetDetector } from '../infrastructure/detectors/DotnetDetector.js';
import { VisualStudioDetector } from '../infrastructure/detectors/VisualStudioDetector.js';
import { MsBuildDetector } from '../infrastructure/detectors/MsBuildDetector.js';
import { CppToolchainDetector } from '../infrastructure/detectors/CppToolchainDetector.js';
import { WindowsSdkDetector } from '../infrastructure/detectors/WindowsSdkDetector.js';
import { CMakeDetector } from '../infrastructure/detectors/CMakeDetector.js';
import { PackageManagerDetector } from '../infrastructure/detectors/PackageManagerDetector.js';
import { runCommand } from '../infrastructure/process/ProcessRunner.js';
import { hostname, userInfo } from 'node:os';

export class EnvironmentService {
  async scan(): Promise<EnvironmentSnapshot> {
    const snapshot = createEmptySnapshot();

    // System info (synchronous)
    snapshot.os = {
      name: process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux',
      version: process.version,
      arch: process.arch,
    };
    snapshot.shell = process.env['SHELL'] ?? process.env['ComSpec'] ?? 'unknown';
    snapshot.cwd = process.cwd();
    snapshot.hostname = hostname();
    snapshot.username = userInfo().username;

    // Git branch
    const gitResult = await runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { timeout: 5000 });
    snapshot.gitBranch = gitResult.exitCode === 0 ? gitResult.stdout.trim() : null;

    // Phase 1: VS detection (others depend on it)
    const vsDetector = new VisualStudioDetector();
    const vsResult = await vsDetector.detect();
    Object.assign(snapshot.visualStudio, vsResult.visualStudio);

    const vsInstallations = snapshot.visualStudio.installations;

    // Phase 2: All other detectors in parallel
    const [dotnetResult, msbuildResult, cppResult, winSdkResult, cmakeResult, pkgResult] =
      await Promise.allSettled([
        new DotnetDetector().detect(),
        new MsBuildDetector().detect(vsInstallations),
        new CppToolchainDetector().detect(vsInstallations),
        new WindowsSdkDetector().detect(),
        new CMakeDetector().detect(),
        new PackageManagerDetector().detect(),
      ]);

    // Merge results (only fulfilled promises)
    if (dotnetResult.status === 'fulfilled' && dotnetResult.value.dotnet) {
      snapshot.dotnet = dotnetResult.value.dotnet;
    }
    if (msbuildResult.status === 'fulfilled' && msbuildResult.value.msbuild) {
      snapshot.msbuild = msbuildResult.value.msbuild;
    }
    if (cppResult.status === 'fulfilled' && cppResult.value.cpp) {
      snapshot.cpp = cppResult.value.cpp;
    }
    if (winSdkResult.status === 'fulfilled' && winSdkResult.value.windowsSdk) {
      snapshot.windowsSdk = winSdkResult.value.windowsSdk;
    }
    if (cmakeResult.status === 'fulfilled') {
      snapshot.cmake = cmakeResult.value.cmake ?? null;
      snapshot.ninja = cmakeResult.value.ninja ?? null;
    }
    if (pkgResult.status === 'fulfilled') {
      snapshot.packageManagers = pkgResult.value.packageManagers ?? snapshot.packageManagers;
      snapshot.git = pkgResult.value.git ?? null;
      snapshot.powershell = pkgResult.value.powershell ?? null;
    }

    return snapshot;
  }
}
