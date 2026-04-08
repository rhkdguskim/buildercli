import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';
import treeKill from 'tree-kill';

export interface ProcessRunnerOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  shell?: boolean;
}

export interface CommandOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class ProcessRunner extends EventEmitter {
  private child: ChildProcess | null = null;

  start(options: ProcessRunnerOptions): void {
    const { command, args = [], cwd, env, shell = true } = options;

    const mergedEnv = env ? { ...process.env, ...env } : process.env;

    // When shell=true, combine command and args into a single string to avoid
    // Node.js DEP0190 deprecation warning about unescaped args with shell option
    if (shell && args.length > 0) {
      const fullCommand = `${command} ${args.join(' ')}`;
      this.child = spawn(fullCommand, [], {
        cwd,
        env: mergedEnv,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } else {
      this.child = spawn(command, args, {
        cwd,
        env: mergedEnv,
        shell,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    }

    if (this.child.stdout) {
      const rl = createInterface({ input: this.child.stdout });
      rl.on('line', (line) => this.emit('stdout', line));
    }

    if (this.child.stderr) {
      const rl = createInterface({ input: this.child.stderr });
      rl.on('line', (line) => this.emit('stderr', line));
    }

    this.child.on('error', (err) => this.emit('error', err));
    this.child.on('close', (code) => this.emit('exit', code ?? 1));
  }

  async cancel(): Promise<void> {
    if (!this.child?.pid) return;
    return new Promise<void>((resolve) => {
      treeKill(this.child!.pid!, 'SIGTERM', (err) => {
        if (err) {
          try { this.child?.kill('SIGKILL'); } catch { /* ignore */ }
        }
        resolve();
      });
    });
  }
}

export async function runCommand(
  command: string,
  args: string[] = [],
  options?: { cwd?: string; env?: Record<string, string>; timeout?: number },
): Promise<CommandOutput> {
  return new Promise((resolve) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const runner = new ProcessRunner();

    const timer = options?.timeout
      ? setTimeout(() => {
          runner.cancel().then(() =>
            resolve({ exitCode: -1, stdout: stdout.join('\n'), stderr: 'timeout' }),
          );
        }, options.timeout)
      : null;

    runner.on('stdout', (line: string) => stdout.push(line));
    runner.on('stderr', (line: string) => stderr.push(line));
    runner.on('error', () => {
      if (timer) clearTimeout(timer);
      resolve({ exitCode: -1, stdout: stdout.join('\n'), stderr: stderr.join('\n') });
    });
    runner.on('exit', (code: number) => {
      if (timer) clearTimeout(timer);
      resolve({ exitCode: code, stdout: stdout.join('\n'), stderr: stderr.join('\n') });
    });

    runner.start({ command, args, cwd: options?.cwd, env: options?.env });
  });
}
