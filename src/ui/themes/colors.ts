export const colors = {
  ok: 'green',
  warning: 'yellow',
  error: 'red',
  unknown: 'gray',
  active: 'blue',
  muted: 'gray',
  accent: 'cyan',
  highlight: 'white',
} as const;

export const severityColors: Record<string, string> = {
  ok: colors.ok,
  warning: colors.warning,
  error: colors.error,
  unknown: colors.unknown,
};

export const symbols = {
  ok: '\u2714',       // ✔
  warning: '\u26A0',  // ⚠
  error: '\u2718',    // ✘
  unknown: '?',
  bullet: '\u2022',   // •
  arrow: '\u25B6',    // ▶
  dash: '\u2500',     // ─
} as const;
