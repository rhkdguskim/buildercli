import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../store/useAppStore.js';
import type { Severity } from '../../domain/enums.js';
import { severityColors, symbols } from '../themes/colors.js';

const FILTERS: Array<{ label: string; value: Severity | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Errors', value: 'error' },
  { label: 'Warnings', value: 'warning' },
  { label: 'OK', value: 'ok' },
];

export const DiagnosticsTab: React.FC = () => {
  const diagnostics = useAppStore(s => s.diagnostics);
  const [filterIdx, setFilterIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const filter = FILTERS[filterIdx]!.value;
  const filtered = filter === 'all' ? diagnostics : diagnostics.filter(d => d.severity === filter);

  useEffect(() => {
    if (selectedIdx >= filtered.length) {
      setSelectedIdx(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIdx]);

  useInput((input, key) => {
    if (key.tab) setFilterIdx(i => (i + 1) % FILTERS.length);
    if (key.upArrow || input === 'k') setSelectedIdx(i => Math.max(0, i - 1));
    if (key.downArrow || input === 'j') setSelectedIdx(i => Math.min(filtered.length - 1, i + 1));
  }, { isActive: !!process.stdin.isTTY });

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="row" marginBottom={1}>
        <Text bold color="cyan">Diagnostics </Text>
        {FILTERS.map((f, i) => (
          <Box key={f.label} marginRight={1}>
            <Text inverse={i === filterIdx} color={i === filterIdx ? 'blue' : 'gray'}>
              {' '}{f.label}{' '}
            </Text>
          </Box>
        ))}
        <Text color="gray"> (Tab to switch filter, ↑↓ or j/k to move)</Text>
      </Box>

      {filtered.length === 0 ? (
        <Text color="green">No issues found.</Text>
      ) : (
        <Box flexDirection="column">
          {filtered.map((item, i) => {
            const color = severityColors[item.severity] ?? 'gray';
            const symbol = symbols[item.severity] ?? '?';
            const isSelected = i === selectedIdx;
            return (
              <Box key={item.id} flexDirection="column" marginBottom={isSelected ? 1 : 0}>
                <Text inverse={isSelected}>
                  <Text color={color}> {symbol} </Text>
                  <Text bold>{item.code}</Text>
                  <Text> {item.title}</Text>
                </Text>
                {isSelected && (
                  <Box flexDirection="column" paddingLeft={4}>
                    <Text color="gray">{item.description}</Text>
                    <Text color="cyan">→ {item.suggestedAction}</Text>
                    {item.relatedPaths.length > 0 && (
                      <Text color="gray">  Files: {item.relatedPaths.join(', ')}</Text>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
