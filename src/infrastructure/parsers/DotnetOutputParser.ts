import { MsBuildOutputParser } from './MsBuildOutputParser.js';

/**
 * dotnet build output follows the same format as MSBuild output.
 * This is a thin wrapper for potential future customizations.
 */
export class DotnetOutputParser extends MsBuildOutputParser {
  // dotnet build uses the same diagnostic format as MSBuild
  // Additional parsing can be added here for dotnet-specific output
}
