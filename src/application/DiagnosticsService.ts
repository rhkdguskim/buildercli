import type { DiagnosticItem } from '../domain/models/DiagnosticItem.js';
import type { EnvironmentSnapshot } from '../domain/models/EnvironmentSnapshot.js';
import type { ProjectInfo } from '../domain/models/ProjectInfo.js';
import { runDotnetRules } from '../domain/rules/dotnetRules.js';
import { runMsBuildRules } from '../domain/rules/msbuildRules.js';
import { runCppRules } from '../domain/rules/cppRules.js';
import { runCMakeRules } from '../domain/rules/cmakeRules.js';
import { runEnvironmentRules } from '../domain/rules/environmentRules.js';
import { runRestoreRules } from '../domain/rules/restoreRules.js';

export class DiagnosticsService {
  analyze(snapshot: EnvironmentSnapshot, projects: ProjectInfo[]): DiagnosticItem[] {
    const items = [
      ...runEnvironmentRules(snapshot),
      ...runDotnetRules(snapshot, projects),
      ...runMsBuildRules(snapshot, projects),
      ...runCppRules(snapshot, projects),
      ...runCMakeRules(snapshot, projects),
      ...runRestoreRules(projects),
    ];

    // Sort: errors first, then warnings, then ok, then unknown
    const severityOrder: Record<string, number> = { error: 0, warning: 1, ok: 2, unknown: 3 };
    items.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

    return items;
  }
}
