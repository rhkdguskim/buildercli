import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TabBar } from './ui/components/TabBar.js';
import { HelpBar } from './ui/components/HelpBar.js';
import { GlobalStatusBar } from './ui/components/GlobalStatusBar.js';
import { ShortcutOverlay } from './ui/components/ShortcutOverlay.js';
import { useTabNavigation } from './ui/hooks/useTabNavigation.js';
import { useEnvironmentScan } from './ui/hooks/useEnvironmentScan.js';
import { useProjectScan } from './ui/hooks/useProjectScan.js';
import { useAppStore } from './ui/store/useAppStore.js';
import { DiagnosticsService } from './application/DiagnosticsService.js';
import { UpdateChecker, type UpdateCheckResult } from './infrastructure/updater/UpdateChecker.js';

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

  // Update notification (background, non-blocking)
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [updateBannerVisible, setUpdateBannerVisible] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'updating' | 'done' | 'error'>('idle');
  const [showHelp, setShowHelp] = useState(false);

  // Background update check — does NOT block the main UI
  useEffect(() => {
    const checker = new UpdateChecker();
    checker.check().then(result => {
      if (result && result.updateAvailable) {
        setUpdateInfo(result);
        setUpdateBannerVisible(true);
      }
    }).catch(() => {
      // Silently ignore update check failures
    });
  }, []);

  // Handle update action
  const performUpdate = () => {
    setUpdateStatus('updating');
    const checker = new UpdateChecker();
    checker.performUpdate().then(success => {
      if (success) {
        setUpdateStatus('done');
        setTimeout(() => exit(), 2000);
      } else {
        setUpdateStatus('error');
        setTimeout(() => setUpdateBannerVisible(false), 4000);
      }
    }).catch(() => {
      setUpdateStatus('error');
      setTimeout(() => setUpdateBannerVisible(false), 4000);
    });
  };

  // Global keybindings
  useInput((input, key) => {
    // Update banner interaction
    if (updateBannerVisible && updateStatus === 'idle') {
      if (input === 'u' || input === 'U') {
        performUpdate();
        return;
      }
      if (input === 'x' || input === 'X') {
        setUpdateBannerVisible(false);
        return;
      }
    }

    if (input === '?') {
      setShowHelp(v => !v);
      return;
    }
    if (input === 'q' && !key.ctrl) {
      exit();
    }
  }, { isActive: !!process.stdin.isTTY });

  // Run diagnostics when both scans complete
  useEffect(() => {
    if (envStatus === 'done' && snapshot && projStatus === 'done') {
      const items = diagnosticsService.analyze(snapshot, projects);
      setDiagnostics(items);
    }
  }, [envStatus, snapshot, projStatus, projects]);

  const helpItems = [
    { key: '1-8', label: 'Tab' },
    { key: '[ ]', label: 'Prev/Next' },
    { key: '?', label: 'Keys' },
    { key: 'q', label: 'Quit' },
  ];

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color="cyan">LazyBuild</Text>
        <Text color="gray">{process.cwd()}</Text>
      </Box>

      <GlobalStatusBar />

      {/* Update notification banner (non-blocking) */}
      {updateBannerVisible && updateInfo && (
        <Box paddingX={1} borderStyle="round" borderColor="yellow" marginX={1}>
          {updateStatus === 'idle' && (
            <Text>
              <Text color="yellow" bold> Update available </Text>
              <Text color="gray">({updateInfo.behindCount} commit(s) behind) </Text>
              <Text color="cyan" bold>[U]</Text><Text> Update </Text>
              <Text color="gray" bold>[X]</Text><Text> Dismiss</Text>
            </Text>
          )}
          {updateStatus === 'updating' && <Text color="yellow">Updating... please wait</Text>}
          {updateStatus === 'done' && <Text color="green">Update complete! Restarting...</Text>}
          {updateStatus === 'error' && <Text color="red">Update failed. Run "git pull && npm install && npm run build" manually.</Text>}
        </Box>
      )}

      {/* Tab Bar */}
      <TabBar tabs={tabs} activeTab={activeTab} />

      {/* Main Content */}
      <Box flexGrow={1} flexDirection="column">
        {showHelp ? (
          <ShortcutOverlay activeTab={activeTab} />
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'environment' && <EnvironmentTab />}
            {activeTab === 'projects' && <ProjectsTab />}
            {activeTab === 'build' && <BuildTab />}
            {activeTab === 'diagnostics' && <DiagnosticsTab />}
            {activeTab === 'logs' && <LogsTab />}
            {activeTab === 'history' && <HistoryTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </Box>

      {/* Help Bar */}
      <HelpBar items={helpItems} />
    </Box>
  );
};

export default App;
