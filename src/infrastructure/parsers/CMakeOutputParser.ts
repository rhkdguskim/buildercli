import type { BuildDiagnostic } from '../../domain/models/BuildResult.js';

// CMake error formats:
// CMake Error at CMakeLists.txt:10 (message):
// path:line:col: error: message
// path(line): error C2065: message (MSVC via CMake)
const CMAKE_ERROR_REGEX = /^CMake\s+(Error|Warning)\s+(?:at\s+(.+?):(\d+))?/i;
const GCC_CLANG_REGEX = /^(.+?):(\d+):(\d+):\s+(error|warning):\s+(.+)$/;
const MSVC_VIA_CMAKE_REGEX = /^(.+?)\((\d+)\)\s*:\s*(error|warning)\s+(\w+)\s*:\s*(.+)$/;

export class CMakeOutputParser {
  private errors: BuildDiagnostic[] = [];
  private warnings: BuildDiagnostic[] = [];

  feedLine(line: string): BuildDiagnostic | null {
    const trimmed = line.trim();

    // CMake's own errors
    const cmakeMatch = trimmed.match(CMAKE_ERROR_REGEX);
    if (cmakeMatch) {
      const diag: BuildDiagnostic = {
        file: cmakeMatch[2] ?? '',
        line: cmakeMatch[3] ? parseInt(cmakeMatch[3], 10) : null,
        column: null,
        severity: cmakeMatch[1]!.toLowerCase() === 'error' ? 'error' : 'warning',
        code: 'CMAKE',
        message: trimmed,
        project: '',
      };
      if (diag.severity === 'error') this.errors.push(diag);
      else this.warnings.push(diag);
      return diag;
    }

    // GCC/Clang style
    const gccMatch = trimmed.match(GCC_CLANG_REGEX);
    if (gccMatch) {
      const diag: BuildDiagnostic = {
        file: gccMatch[1]!,
        line: parseInt(gccMatch[2]!, 10),
        column: parseInt(gccMatch[3]!, 10),
        severity: gccMatch[4] as 'error' | 'warning',
        code: '',
        message: gccMatch[5]!,
        project: '',
      };
      if (diag.severity === 'error') this.errors.push(diag);
      else this.warnings.push(diag);
      return diag;
    }

    // MSVC style (when CMake uses MSVC generator)
    const msvcMatch = trimmed.match(MSVC_VIA_CMAKE_REGEX);
    if (msvcMatch) {
      const diag: BuildDiagnostic = {
        file: msvcMatch[1]!,
        line: parseInt(msvcMatch[2]!, 10),
        column: null,
        severity: msvcMatch[3] as 'error' | 'warning',
        code: msvcMatch[4]!,
        message: msvcMatch[5]!,
        project: '',
      };
      if (diag.severity === 'error') this.errors.push(diag);
      else this.warnings.push(diag);
      return diag;
    }

    return null;
  }

  getSummary(): { errors: BuildDiagnostic[]; warnings: BuildDiagnostic[] } {
    return { errors: [...this.errors], warnings: [...this.warnings] };
  }

  reset(): void {
    this.errors = [];
    this.warnings = [];
  }
}
