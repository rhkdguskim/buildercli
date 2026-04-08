import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../store/useAppStore.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { ProgressPanel } from '../components/ProgressPanel.js';
import type { ProjectInfo, SolutionInfo } from '../../domain/models/ProjectInfo.js';

const typeIcons: Record<string, string> = {
  'dotnet-sdk': 'C#',
  'dotnet-legacy': 'C#*',
  'cpp-msbuild': 'C++',
  cmake: 'CM',
  mixed: 'MIX',
};

const typeColors: Record<string, string> = {
  'dotnet-sdk': 'green',
  'dotnet-legacy': 'yellow',
  'cpp-msbuild': 'blue',
  cmake: 'magenta',
  mixed: 'cyan',
};

export const ProjectsTab: React.FC = () => {
  const projects = useAppStore(s => s.projects);
  const solutions = useAppStore(s => s.solutions);
  const projectScanStatus = useAppStore(s => s.projectScanStatus);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setSelectedIdx(i => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIdx(i => Math.min(projects.length - 1, i + 1));
  }, { isActive: !!process.stdin.isTTY });

  if (projectScanStatus === 'scanning' || projectScanStatus === 'idle') {
    return (
      <Box padding={1}>
        <ProgressPanel label="Scanning projects..." status="scanning" />
      </Box>
    );
  }

  if (projects.length === 0 && solutions.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="yellow">No projects or solutions found in current directory.</Text>
        <Text color="gray">Navigate to a directory containing .sln, .csproj, .vcxproj, or CMakeLists.txt files.</Text>
      </Box>
    );
  }

  const selected = projects[selectedIdx];

  return (
    <Box flexDirection="row" padding={1} flexGrow={1}>
      {/* Left: project list */}
      <Box flexDirection="column" width="45%" borderStyle="single" paddingX={1} overflowY="hidden">
        {/* Solutions header */}
        {solutions.length > 0 && (
          <>
            <Text bold color="cyan">Solutions ({solutions.length})</Text>
            {solutions.map(sln => (
              <Text key={sln.filePath} color="gray">
                {'  '}{sln.name}.sln <Text color={typeColors[sln.solutionType] ?? 'gray'}>({sln.solutionType}, {sln.projects.length} proj)</Text>
              </Text>
            ))}
            <Box height={1} />
          </>
        )}

        <Text bold color="cyan">Projects ({projects.length})</Text>
        {projects.map((proj, i) => {
          const icon = typeIcons[proj.projectType] ?? '?';
          const color = typeColors[proj.projectType] ?? 'gray';
          const isSelected = i === selectedIdx;
          return (
            <Text key={proj.filePath} inverse={isSelected}>
              {isSelected ? ' ▶ ' : '   '}
              <Text color={color}>[{icon}]</Text>
              {' '}{proj.name}
              {proj.riskFlags.length > 0 && <Text color="yellow"> !</Text>}
            </Text>
          );
        })}
      </Box>

      {/* Right: detail panel */}
      <Box flexDirection="column" flexGrow={1} paddingLeft={2}>
        {selected ? (
          <ProjectDetail project={selected} />
        ) : (
          <Text color="gray">Select a project to view details</Text>
        )}
      </Box>
    </Box>
  );
};

const ProjectDetail: React.FC<{ project: ProjectInfo }> = ({ project }) => {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{'─── '}{project.name}{' ───'}</Text>
      <Box height={1} />

      <Box flexDirection="column">
        <Row label="Path" value={project.filePath} />
        <Row label="Type" value={project.projectType} color={typeColors[project.projectType]} />
        <Row label="Language" value={project.language} />
        <Row label="Build System" value={project.buildSystem} />
        <Row label="Recommended" value={project.recommendedCommand} color="cyan" />

        {project.targetFrameworks.length > 0 && (
          <Row label="Target FW" value={project.targetFrameworks.join(', ')} />
        )}
        {project.platformTargets.length > 0 && (
          <Row label="Platforms" value={project.platformTargets.join(', ')} />
        )}
        {project.platformToolset && (
          <Row label="Toolset" value={project.platformToolset} />
        )}
        {project.windowsSdkVersion && (
          <Row label="Windows SDK" value={project.windowsSdkVersion} />
        )}
        {project.solutionPath && (
          <Row label="Solution" value={project.solutionPath} color="gray" />
        )}
      </Box>

      {project.dependencies.length > 0 && (
        <>
          <Box height={1} />
          <Text bold>Dependencies ({project.dependencies.length}):</Text>
          {project.dependencies.slice(0, 10).map(dep => (
            <Text key={dep} color="gray">  {dep}</Text>
          ))}
          {project.dependencies.length > 10 && (
            <Text color="gray">  ... and {project.dependencies.length - 10} more</Text>
          )}
        </>
      )}

      {project.riskFlags.length > 0 && (
        <>
          <Box height={1} />
          <Text bold color="yellow">Risk Flags:</Text>
          {project.riskFlags.map(flag => (
            <Text key={flag} color="yellow">  ⚠ {flag}</Text>
          ))}
        </>
      )}
    </Box>
  );
};

const Row: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <Box flexDirection="row">
    <Box width={16}>
      <Text color="gray">{label}</Text>
    </Box>
    <Text color={color as any}>{value}</Text>
  </Box>
);
