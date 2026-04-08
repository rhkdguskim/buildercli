import { ProcessRunner, runCommand } from './ProcessRunner.js';

/**
 * Wraps build commands inside a Developer Command Prompt session.
 * Runs: cmd /C "call vcvarsall.bat <arch> && <command>"
 */
export class DevShellRunner extends ProcessRunner {
  constructor(
    private vcvarsPath: string,
    private arch: string = 'x64',
  ) {
    super();
  }

  startWithDevShell(command: string, args: string[], cwd?: string): void {
    const fullCmd = `${command} ${args.join(' ')}`;
    const wrappedCommand = `call "${this.vcvarsPath}" ${this.arch} && ${fullCmd}`;

    this.start({
      command: 'cmd',
      args: ['/C', wrappedCommand],
      cwd,
      shell: false, // We're already using cmd
    });
  }
}

/**
 * Captures environment variables set by vcvarsall.bat.
 * Runs: cmd /C "call vcvarsall.bat <arch> && set"
 * Returns the diff from current env.
 */
export async function captureDevShellEnv(
  vcvarsPath: string,
  arch: string = 'x64',
): Promise<Record<string, string>> {
  const result = await runCommand(
    'cmd',
    ['/C', `call "${vcvarsPath}" ${arch} >nul 2>&1 && set`],
    { timeout: 30000 },
  );

  if (result.exitCode !== 0) {
    throw new Error(`Failed to capture dev shell environment: ${result.stderr}`);
  }

  const env: Record<string, string> = {};
  for (const line of result.stdout.split('\n')) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.substring(0, eqIdx);
      const value = line.substring(eqIdx + 1).trim();
      // Only include vars that differ from current env
      if (process.env[key] !== value) {
        env[key] = value;
      }
    }
  }

  return env;
}
