import React from 'react';
import { Box, Text } from 'ink';

export interface TabDef {
  id: string;
  label: string;
  shortcut: string;
}

interface TabBarProps {
  tabs: TabDef[];
  activeTab: string;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab }) => {
  return (
    <Box flexDirection="row" borderStyle="single" borderBottom borderLeft={false} borderRight={false} borderTop={false}>
      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTab;
        return (
          <Box key={tab.id} paddingX={1}>
            <Text bold={isActive} color={isActive ? 'blue' : 'gray'} inverse={isActive}>
              {' '}{tab.shortcut} {tab.label}{' '}
            </Text>
            {i < tabs.length - 1 && <Text color="gray"> </Text>}
          </Box>
        );
      })}
    </Box>
  );
};
