import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../store/useAppStore.js';
import { useBuild } from '../hooks/useBuild.js';
import { ProgressPanel } from '../components/ProgressPanel.js';
import { ScrollableList } from '../components/ScrollableList.js';
import type { ProjectInfo, BuildConfiguration, SolutionInfo } from '../../domain/models/ProjectInfo.js';
import type { BuildProfile } from '../../domain/models/BuildProfile.js';
import type { BuildSystem } from '../../domain/enums.js';

type FocusArea = 'targets' | 'settings' | 'action';
type SettingField = 'configuration' | 'platform' | 'verbosity' | 'devshell';

const FOCUS_AREAS: FocusArea[] = ['targets', 'settings', 'action'];
const SETTING_FIELDS: SettingField[] = ['configuration', 'platform', 'verbosity', 'devshell'];
const VERBOSITIES = ['quiet', 'minimal', 'normal', 'detailed', 'diagnostic'] as const;

export const BuildTab: React.FC = () => {
  const projects = useAppStore(s => s.projects);
  const solutions = useAppStore(s => s.solutions);
  const snapshot = useAppStore(s => s.snapshot);
  const logEntries = useAppStore(s => s.logEntries);
  const { status, result, start, cancel, resolveCommand } = useBuild();

  // Build targets: solutions + standalone projects
  const targets = useMemo(() => {
    const list: Array<{ label: string; project: ProjectInfo | null; solution: SolutionInfo | null; path: string; buildSystem: BuildSystem }> = [];

    for (const sln of solutions) {
      list.push({
        label: `${sln.name}.sln (${sln.solutionType}, ${sln.projects.length} proj)`,
        project: null,
        solution: sln,
        path: sln.filePath,
        buildSystem: sln.solutionType === 'csharp' ? 'dotnet' : 'msbuild',
      });
    }
    for (const proj of projects.filter(p => !p.solutionPath)) {
      list.push({
        label: `${proj.name} [${proj.projectType}]`,
        project: proj,
        solution: null,
        path: proj.filePath,
        buildSystem: proj.buildSystem,
      });
    }
    return list;
  }, [projects, solutions]);

  const [targetIdx, setTargetIdx] = useState(0);
  const [configIdx, setConfigIdx] = useState(0);
  const [platformIdx, setPlatformIdx] = useState(0);
  const [verbosityIdx, setVerbosityIdx] = useState(1); // minimal
  const [useDevShell, setUseDevShell] = useState(false);
  const [focusArea, setFocusArea] = useState<FocusArea>('targets');
  const [activeSetting, setActiveSetting] = useState<SettingField>('configuration');

  // Current target's configurations
  const currentTarget = targets[targetIdx];
  const availableConfigs = useMemo(() => {
    if (!currentTarget) return [{ configuration: 'Debug', platform: 'Any CPU' }];

    if (currentTarget.solution) {
      return currentTarget.solution.configurations.length > 0
        ? currentTarget.solution.configurations
        : [{ configuration: 'Debug', platform: 'Any CPU' }, { configuration: 'Release', platform: 'Any CPU' }];
    }
    if (currentTarget.project) {
      return currentTarget.project.configurations.length > 0
        ? currentTarget.project.configurations
        : [{ configuration: 'Debug', platform: 'Any CPU' }, { configuration: 'Release', platform: 'Any CPU' }];
    }
    return [{ configuration: 'Debug', platform: 'Any CPU' }];
  }, [currentTarget]);

  // Extract unique configurations and platforms
  const uniqueConfigs = useMemo(() => [...new Set(availableConfigs.map(c => c.configuration))], [availableConfigs]);
  const uniquePlatforms = useMemo(() => [...new Set(availableConfigs.map(c => c.platform))], [availableConfigs]);

  // Reset indices when target changes
  useEffect(() => {
    setConfigIdx(0);
    setPlatformIdx(0);
    // Auto-detect if dev shell needed
    if (currentTarget?.buildSystem === 'msbuild' && currentTarget.project?.projectType === 'cpp-msbuild') {
      setUseDevShell(!snapshot?.cpp.vcEnvironmentActive && !!snapshot?.cpp.vcvarsPath);
    } else {
      setUseDevShell(false);
    }
  }, [targetIdx]);

  useEffect(() => {
    if (targetIdx >= targets.length) {
      setTargetIdx(Math.max(0, targets.length - 1));
    }
  }, [targetIdx, targets.length]);

  useEffect(() => {
    if (configIdx >= uniqueConfigs.length) {
      setConfigIdx(Math.max(0, uniqueConfigs.length - 1));
    }
  }, [configIdx, uniqueConfigs.length]);

  useEffect(() => {
    if (platformIdx >= uniquePlatforms.length) {
      setPlatformIdx(Math.max(0, uniquePlatforms.length - 1));
    }
  }, [platformIdx, uniquePlatforms.length]);

  // Build the profile
  const profile: BuildProfile | null = useMemo(() => {
    if (!currentTarget) return null;
    return {
      id: crypto.randomUUID(),
      name: 'Quick Build',
      targetPath: currentTarget.path,
      buildSystem: currentTarget.buildSystem,
      configuration: uniqueConfigs[configIdx] ?? 'Debug',
      platform: uniquePlatforms[platformIdx] ?? 'Any CPU',
      extraArguments: [],
      useDeveloperShell: useDevShell,
      enableBinaryLog: false,
      verbosity: VERBOSITIES[verbosityIdx]!,
    };
  }, [currentTarget, configIdx, platformIdx, verbosityIdx, useDevShell]);

  // Resolve command preview
  const commandPreview = useMemo(() => {
    if (!profile || !currentTarget) return '';
    const proj = currentTarget.project ?? currentTarget.solution?.projects[0];
    if (!proj) return '';
    return resolveCommand(proj, profile)?.displayString ?? '';
  }, [profile, currentTarget, resolveCommand]);

  const runBuild = () => {
    if (!currentTarget || !profile) return;
    const proj = currentTarget.project ?? currentTarget.solution?.projects[0];
    if (proj) start(proj, profile);
  };

  const adjustSetting = (dir: 1 | -1) => {
    switch (activeSetting) {
      case 'configuration':
        setConfigIdx(i => Math.max(0, Math.min(uniqueConfigs.length - 1, i + dir)));
        break;
      case 'platform':
        setPlatformIdx(i => Math.max(0, Math.min(uniquePlatforms.length - 1, i + dir)));
        break;
      case 'verbosity':
        setVerbosityIdx(i => Math.max(0, Math.min(VERBOSITIES.length - 1, i + dir)));
        break;
      case 'devshell':
        setUseDevShell(v => !v);
        break;
    }
  };

  const cycleFocusArea = (dir: 1 | -1) => {
    const idx = FOCUS_AREAS.indexOf(focusArea);
    const next = (idx + dir + FOCUS_AREAS.length) % FOCUS_AREAS.length;
    setFocusArea(FOCUS_AREAS[next]!);
  };

  // Keyboard navigation
  useInput((input, key) => {
    if (status === 'running') {
      if (key.escape || input === 'c') {
        cancel();
      }
      return;
    }

    if (key.tab) {
      cycleFocusArea(key.shift ? -1 : 1);
      return;
    }

    if (focusArea === 'targets') {
      if (key.upArrow || input === 'k') {
        setTargetIdx(i => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setTargetIdx(i => Math.min(targets.length - 1, i + 1));
        return;
      }
      if (key.return) {
        setFocusArea('settings');
        return;
      }
    }

    if (focusArea === 'settings') {
      if (key.upArrow || input === 'k') {
        const idx = SETTING_FIELDS.indexOf(activeSetting);
        if (idx > 0) setActiveSetting(SETTING_FIELDS[idx - 1]!);
        return;
      }
      if (key.downArrow || input === 'j') {
        const idx = SETTING_FIELDS.indexOf(activeSetting);
        if (idx < SETTING_FIELDS.length - 1) setActiveSetting(SETTING_FIELDS[idx + 1]!);
        return;
      }
      if (key.leftArrow || input === 'h') {
        adjustSetting(-1);
        return;
      }
      if (key.rightArrow || input === 'l') {
        adjustSetting(1);
        return;
      }
      if (input === ' ') {
        if (activeSetting === 'devshell') {
          setUseDevShell(v => !v);
        } else {
          setFocusArea('action');
        }
        return;
      }
      if (key.return) {
        setFocusArea('action');
        return;
      }
    }

    if (focusArea === 'action' && (key.return || input === ' ')) {
      runBuild();
      return;
    }

    if (input === '\x1b[15~' || input === 'b' || (key.ctrl && input === 'b')) {
      runBuild();
    }
  }, { isActive: !!process.stdin.isTTY });

  if (targets.length === 0) {
    return (
      <Box padding={1}>
        <Text color="yellow">No build targets found. Scan a directory with projects first.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="row" padding={1} flexGrow={1}>
      <Box flexDirection="column" width="38%" paddingRight={2}>
        <Text bold color="cyan">{'─── Targets ───'}</Text>
        <Box borderStyle="round" borderColor={focusArea === 'targets' ? 'cyan' : 'gray'} paddingX={1} paddingY={0} flexDirection="column">
          <Text color="gray">↑↓ or j/k to move, Enter to configure</Text>
          <ScrollableList
            selectedIdx={targetIdx}
            maxVisible={8}
            items={targets.map((target, i) => (
              <Text key={target.path} inverse={i === targetIdx}>
                {i === targetIdx ? ' ▶ ' : '   '}
                {target.label}
              </Text>
            ))}
          />
        </Box>

        <Box height={1} />
        <Text bold color="cyan">{'─── Build Setup ───'}</Text>
        <Box borderStyle="round" borderColor={focusArea === 'settings' ? 'cyan' : 'gray'} paddingX={1} paddingY={0} flexDirection="column">
          <Text color="gray">Tab to switch section, h/l to change value</Text>
          <Box height={1} />
          <FieldRow
            label="Configuration"
            value={uniqueConfigs[configIdx] ?? 'Debug'}
            active={focusArea === 'settings' && activeSetting === 'configuration'}
            options={uniqueConfigs}
            selectedIdx={configIdx}
          />

          <FieldRow
            label="Platform"
            value={uniquePlatforms[platformIdx] ?? 'Any CPU'}
            active={focusArea === 'settings' && activeSetting === 'platform'}
            options={uniquePlatforms}
            selectedIdx={platformIdx}
          />

          <FieldRow
            label="Verbosity"
            value={VERBOSITIES[verbosityIdx]!}
            active={focusArea === 'settings' && activeSetting === 'verbosity'}
            options={[...VERBOSITIES]}
            selectedIdx={verbosityIdx}
          />

          <FieldRow
            label="Dev Shell"
            value={useDevShell ? 'ON' : 'OFF'}
            active={focusArea === 'settings' && activeSetting === 'devshell'}
            hint={useDevShell ? 'vcvarsall.bat will be used' : 'space to toggle'}
          />
        </Box>

        <Box marginTop={1}>
          <Text inverse={focusArea === 'action'} color={focusArea === 'action' ? 'green' : 'gray'}>
            {status === 'running' ? '  ■ Cancel (Esc)  ' : '  ▶ Build (Enter)  '}
          </Text>
        </Box>

        <Box height={1} />
        <Text bold color="cyan">{'─── Command Preview ───'}</Text>
        <Box marginTop={1}>
          <Text color="gray" wrap="wrap">{commandPreview || 'Select a target to preview command'}</Text>
        </Box>

        {/* Build result */}
        {result && (
          <>
            <Box height={1} />
            <Text bold color={result.status === 'success' ? 'green' : 'red'}>
              {'─── Result: '}{result.status.toUpperCase()}{' ───'}
            </Text>
            <Text>Exit code: {result.exitCode}</Text>
            <Text>Duration: {result.durationMs}ms</Text>
            <Text color="red">Errors: {result.errorCount}</Text>
            <Text color="yellow">Warnings: {result.warningCount}</Text>
          </>
        )}
      </Box>

      {/* Right: Live output */}
      <Box flexDirection="column" flexGrow={1} borderStyle="single" paddingX={1}>
        <Text bold color="cyan">Output</Text>
        {currentTarget && (
          <Text color="gray" wrap="truncate">
            {currentTarget.buildSystem} | {currentTarget.path}
          </Text>
        )}
        {status === 'running' && <ProgressPanel label="Building..." status="scanning" />}
        {status === 'idle' && logEntries.length === 0 && <Text color="gray">Build output will appear here</Text>}

        <Box flexDirection="column" flexGrow={1} overflowY="hidden">
          {logEntries.slice(-30).map((entry, i) => (
            <Text key={entry.index} color={
              entry.level === 'error' ? 'red' :
              entry.level === 'warning' ? 'yellow' :
              entry.source === 'stderr' ? 'red' : undefined
            } wrap="truncate">
              {entry.text}
            </Text>
          ))}
        </Box>

        {logEntries.length > 30 && (
          <Text color="gray">... showing last 30 of {logEntries.length} lines (see Logs tab for full output)</Text>
        )}

        <Box marginTop={1}>
          <Text color="gray">Tab: section | ↑↓: move | h/l: change | Space/Enter: select/build | b: build now</Text>
        </Box>
      </Box>
    </Box>
  );
};

interface FieldRowProps {
  label: string;
  value: string;
  active: boolean;
  hint?: string;
  options?: string[];
  selectedIdx?: number;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, value, active, hint, options, selectedIdx }) => {
  const hasMultiple = options && options.length > 1;
  const idx = selectedIdx ?? 0;
  const total = options?.length ?? 0;

  return (
    <Box flexDirection="row" marginBottom={0}>
      <Box width={16} flexShrink={0}>
        <Text color={active ? 'cyan' : 'gray'} bold={active}>
          {active ? '▶ ' : '  '}{label}
        </Text>
      </Box>
      <Box flexShrink={0}>
        {hasMultiple ? (
          <Text>
            <Text color={active ? 'white' : 'gray'}>◄ </Text>
            <Text bold inverse={active} color={active ? 'white' : undefined}> {value} </Text>
            <Text color={active ? 'white' : 'gray'}> ► </Text>
            <Text color="gray">({idx + 1}/{total})</Text>
          </Text>
        ) : (
          <Text bold={active}>{value}</Text>
        )}
        {hint && <Text color="gray"> {hint}</Text>}
      </Box>
    </Box>
  );
};
