import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../store/useAppStore.js';
import { useBuild } from '../hooks/useBuild.js';
import { ProgressPanel } from '../components/ProgressPanel.js';
import type { ProjectInfo, BuildConfiguration, SolutionInfo } from '../../domain/models/ProjectInfo.js';
import type { BuildProfile } from '../../domain/models/BuildProfile.js';
import type { BuildSystem } from '../../domain/enums.js';

type Field = 'target' | 'configuration' | 'platform' | 'verbosity' | 'devshell' | 'action';

const FIELDS: Field[] = ['target', 'configuration', 'platform', 'verbosity', 'devshell', 'action'];
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
  const [activeField, setActiveField] = useState<Field>('target');

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

  // Keyboard navigation
  useInput((input, key) => {
    if (status === 'running') {
      if (key.escape || input === 'c') {
        cancel();
      }
      return;
    }

    if (key.upArrow) {
      const idx = FIELDS.indexOf(activeField);
      if (idx > 0) setActiveField(FIELDS[idx - 1]!);
    }
    if (key.downArrow) {
      const idx = FIELDS.indexOf(activeField);
      if (idx < FIELDS.length - 1) setActiveField(FIELDS[idx + 1]!);
    }

    if (key.leftArrow || key.rightArrow) {
      const dir = key.rightArrow ? 1 : -1;
      switch (activeField) {
        case 'target':
          setTargetIdx(i => Math.max(0, Math.min(targets.length - 1, i + dir)));
          break;
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
    }

    if (key.return && activeField === 'action' && currentTarget && profile) {
      const proj = currentTarget.project ?? currentTarget.solution?.projects[0];
      if (proj) start(proj, profile);
    }

    // F5 shortcut
    if (input === '\x1b[15~' || (key.ctrl && input === 'b')) {
      if (currentTarget && profile) {
        const proj = currentTarget.project ?? currentTarget.solution?.projects[0];
        if (proj) start(proj, profile);
      }
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
      {/* Left: Build configuration */}
      <Box flexDirection="column" width="50%" paddingRight={2}>
        <Text bold color="cyan">{'─── Build Configuration ───'}</Text>
        <Box height={1} />

        <FieldRow
          label="Target"
          value={currentTarget?.label ?? 'none'}
          active={activeField === 'target'}
          hint={`${targetIdx + 1}/${targets.length}`}
        />

        <FieldRow
          label="Configuration"
          value={uniqueConfigs[configIdx] ?? 'Debug'}
          active={activeField === 'configuration'}
          options={uniqueConfigs}
          selectedIdx={configIdx}
        />

        <FieldRow
          label="Platform"
          value={uniquePlatforms[platformIdx] ?? 'Any CPU'}
          active={activeField === 'platform'}
          options={uniquePlatforms}
          selectedIdx={platformIdx}
        />

        <FieldRow
          label="Verbosity"
          value={VERBOSITIES[verbosityIdx]!}
          active={activeField === 'verbosity'}
          options={[...VERBOSITIES]}
          selectedIdx={verbosityIdx}
        />

        <FieldRow
          label="Dev Shell"
          value={useDevShell ? 'ON' : 'OFF'}
          active={activeField === 'devshell'}
          hint={useDevShell ? 'vcvarsall.bat will be used' : ''}
        />

        <Box marginTop={1}>
          <Text inverse={activeField === 'action'} color={activeField === 'action' ? 'green' : 'gray'}>
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

const FieldRow: React.FC<FieldRowProps> = ({ label, value, active, hint, options, selectedIdx }) => (
  <Box flexDirection="row" marginBottom={0}>
    <Box width={16}>
      <Text color={active ? 'cyan' : 'gray'} bold={active}>
        {active ? '▶ ' : '  '}{label}
      </Text>
    </Box>
    <Box>
      {options && options.length > 1 ? (
        <Box>
          <Text color={active ? 'white' : 'gray'}>{'◄ '}</Text>
          {options.map((opt, i) => (
            <Text key={opt} bold={i === selectedIdx} color={i === selectedIdx ? 'white' : 'gray'} inverse={i === selectedIdx}>
              {' '}{opt}{' '}
            </Text>
          ))}
          <Text color={active ? 'white' : 'gray'}>{' ►'}</Text>
        </Box>
      ) : (
        <Text bold={active}>{value}</Text>
      )}
      {hint && <Text color="gray"> {hint}</Text>}
    </Box>
  </Box>
);
