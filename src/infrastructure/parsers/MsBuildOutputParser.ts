import type { BuildDiagnostic } from '../../domain/models/BuildResult.js';

// MSBuild/dotnet build error/warning format:
// path(line,col): error CS1002: ; expected [project]
// path(line,col): warning CS0168: The variable 'x' is declared but never used [project]
// Link errors: LINK : fatal error LNK1120: 1 unresolved externals [project]
// C++ errors: path(line): error C2065: 'xxx': undeclared identifier [project]
const DIAG_REGEX = /^(.+?)\((\d+)(?:,(\d+))?\)\s*:\s*(error|warning)\s+(\w+)\s*:\s*(.+?)(?:\s+\[(.+)])?$/;
const LINK_REGEX = /^(?:LINK\s*:\s*)?(?:fatal\s+)?(error|warning)\s+(\w+)\s*:\s*(.+?)(?:\s+\[(.+)])?$/;

export class MsBuildOutputParser {
  private errors: BuildDiagnostic[] = [];
  private warnings: BuildDiagnostic[] = [];

  feedLine(line: string): BuildDiagnostic | null {
    const trimmed = line.trim();

    // Standard file(line,col): error/warning pattern
    const match = trimmed.match(DIAG_REGEX);
    if (match) {
      const diag: BuildDiagnostic = {
        file: match[1]!,
        line: parseInt(match[2]!, 10),
        column: match[3] ? parseInt(match[3], 10) : null,
        severity: match[4] as 'error' | 'warning',
        code: match[5]!,
        message: match[6]!.trim(),
        project: match[7]?.replace(/.*[/\\]/, '').replace(/\]$/, '') ?? '',
      };
      if (diag.severity === 'error') this.errors.push(diag);
      else this.warnings.push(diag);
      return diag;
    }

    // Link/general error without file location
    const linkMatch = trimmed.match(LINK_REGEX);
    if (linkMatch) {
      const diag: BuildDiagnostic = {
        file: '',
        line: null,
        column: null,
        severity: linkMatch[1] as 'error' | 'warning',
        code: linkMatch[2]!,
        message: linkMatch[3]!.trim(),
        project: linkMatch[4]?.replace(/.*[/\\]/, '').replace(/\]$/, '') ?? '',
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
