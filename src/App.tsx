import React, { useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TabBar } from './ui/components/TabBar.js';
import { HelpBar } from './ui/components/HelpBar.js';
import { useTabNavigation, TAB_DEFS } from './ui/hooks/useTabNavigation.js';
import { useEnvironmentScan } from './ui/hooks/useEnvironmentScan.js';
import { useProjectScan } from './ui/hooks/useProjectScan.js';
import { useAppStore } from './ui/store/useAppStore.js';
import { DiagnosticsService } from './application/DiagnosticsService.js';

import { OverviewTab } from './ui/tabs/OverviewTab.js';
import { EnvironmentTab } from './ui/tabs/EnvironmentTab.js';
import { ProjectsTab } from './ui/tabs/ProjectsTab.js';
import { BuildTab } from './ui/tabs/BuildTab.js';
import { DiagnosticsTab } from './ui/tabs/DiagnosticsTab.js';
import { LogsTab } from './ui/tabs/LogsTab.js';
import { HistoryTab } from './ui/tabs/HistoryTab.js';
import { SettingsTab } from './ui/tabs/SettingsTab.js';

const diagnosticsService = new DiagnosticsService();

const App: React.FC = () => {
  const { exit } = useApp();
  const { activeTab, tabs } = useTabNavigation();
  const { snapshot, status: envStatus } = useEnvironmentScan();
  const { projects, status: projStatus } = useProjectScan();
  const setDiagnostics = useAppStore(s => s.setDiagnostics);

  // Run diagnostics when both scans complete
  useEffect(() => {
    if (envStatus === 'done' && snapshot && projStatus === 'done') {
      const items = diagnosticsService.analyze(snapshot, projects);
      setDiagnostics(items);
    }
  }, [envStatus, snapshot, projStatus, projects]);

  // Global keybindings
  useInput((input, key) => {
    if (input === 'q' && !key.ctrl) {
      exit();
    }
  }, { isActive: !!process.stdin.isTTY });

  const helpItems = [
    { key: 'Ctrl+1-8', label: 'Tab' },
    { key: 'Ctrl+←→', label: 'Prev/Next' },
    { key: '↑↓', label: 'Navigate' },
    { key: 'q', label: 'Quit' },
  ];

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color="cyan">LazyBuild</Text>
        <Text color="gray">{process.cwd()}</Text>
      </Box>

      {/* Tab Bar */}
      <TabBar tabs={tabs} activeTab={activeTab} />

      {/* Main Content */}
      <Box flexGrow={1} flexDirection="column">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'environment' && <EnvironmentTab />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'build' && <BuildTab />}
        {activeTab === 'diagnostics' && <DiagnosticsTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </Box>

      {/* Help Bar */}
      <HelpBar items={helpItems} />
    </Box>
  );
};

export default App;
