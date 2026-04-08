import React from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '../store/useAppStore.js';

export const HistoryTab: React.FC = () => {
  const history = useAppStore(s => s.buildHistory);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">{'─── Build History ───'}</Text>
      <Box height={1} />
      {history.length === 0 ? (
        <Text color="gray">No build history yet.</Text>
      ) : (
        history.map((r, i) => (
          <Text key={i}>
            <Text color="gray">{r.startTime.toISOString()}</Text>
            {' '}
            <Text color={r.status === 'success' ? 'green' : 'red'}>{r.status}</Text>
            {' '}
            <Text>({r.durationMs}ms, {r.errorCount}E/{r.warningCount}W)</Text>
          </Text>
        ))
      )}
    </Box>
  );
};
