import type { Severity, DiagnosticCategory } from '../enums.js';

export interface DiagnosticItem {
  id: string;
  category: DiagnosticCategory;
  severity: Severity;
  code: string;
  title: string;
  description: string;
  suggestedAction: string;
  relatedPaths: string[];
}
