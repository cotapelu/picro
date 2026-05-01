# picro

**AI Coding Agent with Terminal UI** - A professional, extensible framework for building interactive coding assistants.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [@picro/tui](./packages/tui/README.md) | Terminal UI Library | ✅ Build: Pass, Tests: 113 |
| [@picro/agent](./packages/agent/README.md) | Core Agent Logic | ✅ Build: Pass, Tests: 126 |
| [@picro/llm](./packages/llm/README.md) | LLM Integration | ✅ Build: Pass |
| [@picro/memory](./packages/memory/README.md) | Memory Management | ✅ Build: Pass |

## Features

- 🖥️ **Rich Terminal UI** - Components, overlays, images, keybindings
- 🤖 **Agent Framework** - Tool execution, session management, compaction
- 🔌 **Extensible** - Plugin system với tools và extensions
- 🛡️ **Secure** - Output sanitization, binary detection, size limits
- 📊 **Observable** - Telemetry, diagnostics, performance metrics
- 🔧 **Developer Friendly** - TypeScript, comprehensive APIs, examples

## Quick Start

```bash
# Clone và install dependencies
git clone <repo>
cd picro
npm install

# Build all packages
npm run build

# Run tests
npm test
```


## Architecture

```
┌─────────────────┐
│   Coding Agent  │ ← High-level API (TUI + Agent + LLM)
├─────────────────┤
│   @picro/tui    │ ← Terminal UI components, rendering
│   @picro/agent  │ ← Agent session, tools, execution
│   @picro/llm    │ ← LLM provider abstraction
│   @picro/memory │ ← Vector storage & retrieval
└─────────────────┘
```

## Development

### Monorepo Structure

```
packages/
├── tui/          # Terminal UI library
├── agent/        # Core agent logic
├── llm/          # LLM integration
├── memory/       # Memory/vector storage
└── coding-agent/ # Combined wrapper (optional)
```


## Design Principles

- **Clean-room implementation** - No copy-paste from reference material
- **TypeScript strict** - Full type safety
- **Test coverage** - Minimum 80% coverage
- **Documentation** - API docs, examples, guides
- **Performance** - Incremental rendering, streaming, caching
- **Security** - Input sanitization, output validation


## License

Apache-2.0

## Contributing


## Links

- [Documentation](./docs/)
