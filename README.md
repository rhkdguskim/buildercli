# LazyBuild - .NET / MSBuild / C++ Build TUI

Terminal UI for diagnosing build environments and executing builds without Visual Studio IDE.

## Features

- **Environment Detection**: .NET SDK, MSBuild, Visual Studio, C++ Toolchain, Windows SDK (7/8.1/10/11), CMake, Ninja, Git
- **Project Scanning**: .sln, .csproj, .vcxproj, CMakeLists.txt auto-discovery with type classification
- **Configuration Manager**: Parses solution/project Configuration|Platform pairs for build target selection
- **Build Execution**: dotnet build, msbuild, cmake --build with real-time streaming output
- **Diagnostics**: Pre-build environment validation with actionable fix suggestions
- **Log Viewer**: Filtered log output with error/warning parsing and summary
- **Cross-platform**: Windows primary, Linux/macOS partial support

## Requirements

- **Node.js** >= 20.0.0
- **Terminal** with Unicode support (Windows Terminal recommended)

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/rhkdguskim/buildercli.git
cd buildercli

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
npm start
```

### Global Install (after build)

```bash
npm link
lazybuild
```

## Usage

```bash
# Run in current directory
npm run dev

# Or after global install
lazybuild
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+1~8` | Switch to tab directly |
| `Ctrl+←→` | Previous/Next tab |
| `↑↓` | Navigate lists |
| `←→` | Change selection (Build tab) |
| `Enter` | Confirm / Execute build |
| `Esc` | Cancel build |
| `Tab` | Switch filter |
| `f` | Toggle log follow mode |
| `q` | Quit |

### Tabs

1. **Overview** - Build environment status at a glance
2. **Environment** - Detailed tool/SDK information by category
3. **Projects** - Scanned solutions and projects with metadata
4. **Build** - Configuration manager, command preview, build execution
5. **Diagnostics** - Environment issues with severity and fix suggestions
6. **Logs** - Real-time build log with filtering
7. **History** - Past build results
8. **Settings** - Application configuration

## Tech Stack

- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [React 18](https://react.dev/) - UI components
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) - .csproj/.vcxproj parsing
- [fast-glob](https://github.com/mrmlnc/fast-glob) - File discovery
- [tree-kill](https://github.com/pkrber/tree-kill) - Process tree management

## Project Structure

```
src/
├── domain/          # Types, enums, diagnostic rules
├── infrastructure/  # Process runner, detectors, parsers, adapters
├── application/     # Service orchestration
└── ui/              # React/Ink components, hooks, store
```

## License

MIT
