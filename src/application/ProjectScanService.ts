import type { ProjectInfo, SolutionInfo } from '../domain/models/ProjectInfo.js';
import { FileScanner } from '../infrastructure/scanners/FileScanner.js';
import { SolutionFileParser } from '../infrastructure/scanners/SolutionFileParser.js';
import { ProjectFileParser } from '../infrastructure/scanners/ProjectFileParser.js';

export interface ProjectScanResult {
  projects: ProjectInfo[];
  solutions: SolutionInfo[];
}

export class ProjectScanService {
  private fileScanner = new FileScanner();
  private slnParser = new SolutionFileParser();
  private projParser = new ProjectFileParser();

  async scan(directory: string): Promise<ProjectScanResult> {
    const scanned = await this.fileScanner.scan(directory);
    const solutions: SolutionInfo[] = [];
    const standaloneProjects: ProjectInfo[] = [];
    const solutionProjectPaths = new Set<string>();

    // Parse solutions first
    for (const slnPath of scanned.solutions) {
      try {
        const sln = this.slnParser.parse(slnPath);
        solutions.push(sln);
        for (const proj of sln.projects) {
          solutionProjectPaths.add(proj.filePath);
        }
      } catch {
        // Skip unparseable solutions
      }
    }

    // Parse standalone projects (not part of any solution)
    for (const csproj of scanned.csharpProjects) {
      if (!solutionProjectPaths.has(csproj)) {
        try {
          standaloneProjects.push(this.projParser.parseCsproj(csproj));
        } catch { /* skip */ }
      }
    }

    for (const fsproj of scanned.fsharpProjects) {
      if (!solutionProjectPaths.has(fsproj)) {
        try {
          standaloneProjects.push(this.projParser.parseFsproj(fsproj));
        } catch { /* skip */ }
      }
    }

    for (const vbproj of scanned.vbProjects) {
      if (!solutionProjectPaths.has(vbproj)) {
        try {
          standaloneProjects.push(this.projParser.parseVbproj(vbproj));
        } catch { /* skip */ }
      }
    }

    for (const vcxproj of scanned.cppProjects) {
      if (!solutionProjectPaths.has(vcxproj)) {
        try {
          standaloneProjects.push(this.projParser.parseVcxproj(vcxproj));
        } catch { /* skip */ }
      }
    }

    for (const cmake of scanned.cmakeFiles) {
      try {
        standaloneProjects.push(this.projParser.parseCMakeLists(cmake));
      } catch { /* skip */ }
    }

    // Merge: all solution projects + standalone projects
    const allProjects = [
      ...solutions.flatMap(s => s.projects),
      ...standaloneProjects,
    ];

    // Update recommended commands for solutions
    for (const sln of solutions) {
      if (sln.solutionType === 'mixed' || sln.solutionType === 'cpp') {
        // Mixed or C++ solutions should use msbuild
        for (const proj of sln.projects) {
          if (proj.buildSystem === 'dotnet') {
            proj.recommendedCommand = 'msbuild';
          }
        }
      }
    }

    return { projects: allProjects, solutions };
  }
}
