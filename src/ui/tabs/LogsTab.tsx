import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../store/useAppStore.js';

type LogFilter = 'all' | 'error' | 'warning' | 'stderr';
const FILTERS: Array<{ label: string; value: LogFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Errors', value: 'error' },
  { label: 'Warnings', value: 'warning' },
  { label: 'Stderr', value: 'stderr' },
];

export const LogsTab: React.FC = () => {
  const logEntries = useAppStore(s => s.logEntries);
  const clearLogs = useAppStore(s => s.clearLogs);
  const [filterIdx, setFilterIdx] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [following, setFollowing] = useState(true);

  const filter = FILTERS[filterIdx]!.value;

  const filtered = useMemo(() => {
    if (filter === 'all') return logEntries;
    if (filter === 'stderr') return logEntries.filter(e => e.source === 'stderr');
    return logEntries.filter(e => e.level === filter);
  }, [logEntries, filter]);

  const windowSize = 25;
  const maxOffset = Math.max(0, filtered.length - windowSize);

  useEffect(() => {
    if (!following && scrollOffset > maxOffset) {
      setScrollOffset(maxOffset);
    }
  }, [following, maxOffset, scrollOffset]);

  // Auto-follow
  const effectiveOffset = following ? maxOffset : Math.min(scrollOffset, maxOffset);
  const visible = filtered.slice(effectiveOffset, effectiveOffset + windowSize);

  const errorCount = logEntries.filter(e => e.level === 'error').length;
  const warnCount = logEntries.filter(e => e.level === 'warning').length;

  useInput((input, key) => {
    if (key.tab) setFilterIdx(i => (i + 1) % FILTERS.length);
    if (key.upArrow || input === 'k') {
      setFollowing(false);
      setScrollOffset(o => Math.max(0, o - 1));
    }
    if (key.downArrow || input === 'j') {
      setScrollOffset(o => {
        const next = Math.min(maxOffset, o + 1);
        if (next >= maxOffset) setFollowing(true);
        return next;
      });
    }
    if (input === 'f') setFollowing(f => !f);
    if (input === 'G') {
      setFollowing(true);
      setScrollOffset(maxOffset);
    }
    if (key.ctrl && input === 'l') clearLogs();
  }, { isActive: !!process.stdin.isTTY });

  return (
    <Box flexDirection="column" padding={1} flexGrow={1}>
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box>
          <Text bold color="cyan">Logs </Text>
          {FILTERS.map((f, i) => (
            <Box key={f.label} marginRight={1}>
              <Text inverse={i === filterIdx} color={i === filterIdx ? 'blue' : 'gray'}>
                {' '}{f.label}{' '}
              </Text>
            </Box>
          ))}
        </Box>
        <Box>
          <Text color={following ? 'green' : 'gray'}>
            {following ? '⬇ Follow' : '⏸ Paused'}
          </Text>
          <Text color="gray"> | {filtered.length}/{logEntries.length} lines</Text>
          {errorCount > 0 && <Text color="red"> | {errorCount}E</Text>}
          {warnCount > 0 && <Text color="yellow"> {warnCount}W</Text>}
        </Box>
      </Box>

      {/* Log view */}
      <Box flexDirection="column" flexGrow={1} marginTop={1} borderStyle="single" paddingX={1}>
        {logEntries.length === 0 ? (
          <Text color="gray">No build logs. Run a build to see output here.</Text>
        ) : filtered.length === 0 ? (
          <Text color="gray">No entries match the current filter.</Text>
        ) : (
          visible.map((entry) => (
            <Text key={entry.index} color={
              entry.level === 'error' ? 'red' :
              entry.level === 'warning' ? 'yellow' :
              entry.source === 'stderr' ? 'red' : undefined
            } wrap="truncate">
              {entry.text}
            </Text>
          ))
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text color="gray">Tab: filter | ↑↓ or j/k: scroll | f: follow | G: end | Ctrl+L: clear</Text>
      </Box>
    </Box>
  );
};
