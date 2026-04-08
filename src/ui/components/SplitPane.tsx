import React from 'react';
import { Box } from 'ink';

interface SplitPaneProps {
  direction?: 'horizontal' | 'vertical';
  splitPercent?: number;
  left: React.ReactNode;
  right: React.ReactNode;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  direction = 'horizontal',
  splitPercent = 50,
  left,
  right,
}) => {
  const flexDir = direction === 'horizontal' ? 'row' : 'column';
  const sizeProp = direction === 'horizontal' ? 'width' : 'height';

  return (
    <Box flexDirection={flexDir as any} flexGrow={1}>
      <Box {...{ [sizeProp]: `${splitPercent}%` }} flexShrink={0}>
        {left}
      </Box>
      <Box flexGrow={1}>
        {right}
      </Box>
    </Box>
  );
};
