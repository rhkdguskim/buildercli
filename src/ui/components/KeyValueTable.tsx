import React from 'react';
import { Box, Text } from 'ink';

interface KeyValueTableProps {
  rows: Array<{ key: string; value: string; color?: string }>;
  keyWidth?: number;
}

export const KeyValueTable: React.FC<KeyValueTableProps> = ({ rows, keyWidth = 20 }) => {
  return (
    <Box flexDirection="column">
      {rows.map((row, i) => (
        <Box key={i} flexDirection="row">
          <Box width={keyWidth}>
            <Text color="gray">{row.key}</Text>
          </Box>
          <Text color={row.color as any}>{row.value}</Text>
        </Box>
      ))}
    </Box>
  );
};
