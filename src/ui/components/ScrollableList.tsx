import React, { useMemo } from 'react';
import { Box, Text } from 'ink';

interface ScrollableListProps {
  items: React.ReactNode[];
  selectedIdx: number;
  maxVisible?: number;
  /** Show scroll indicators */
  showScrollbar?: boolean;
}

/**
 * Renders a fixed-height windowed list that only shows `maxVisible` items.
 * The window follows the selected index.
 */
export const ScrollableList: React.FC<ScrollableListProps> = ({
  items,
  selectedIdx,
  maxVisible = 15,
  showScrollbar = true,
}) => {
  const { windowStart, windowEnd } = useMemo(() => {
    const total = items.length;
    if (total <= maxVisible) {
      return { windowStart: 0, windowEnd: total };
    }

    // Keep selected item roughly centered in the window
    let start = selectedIdx - Math.floor(maxVisible / 2);
    start = Math.max(0, Math.min(start, total - maxVisible));
    return { windowStart: start, windowEnd: start + maxVisible };
  }, [items.length, selectedIdx, maxVisible]);

  const visible = items.slice(windowStart, windowEnd);
  const hasMore = items.length > maxVisible;
  const canScrollUp = windowStart > 0;
  const canScrollDown = windowEnd < items.length;

  return (
    <Box flexDirection="column">
      {showScrollbar && canScrollUp && (
        <Text color="gray">{`  ▲ ${windowStart} more above`}</Text>
      )}
      {visible}
      {showScrollbar && canScrollDown && (
        <Text color="gray">{`  ▼ ${items.length - windowEnd} more below`}</Text>
      )}
    </Box>
  );
};
