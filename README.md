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

## Usage

### Basic Agent

```typescript
import { AgentSession } from '@picro/agent';

const session = new AgentSession({
  cwd: process.cwd(),
  model: 'anthropic/claude-3.5-sonnet',
});

const result = await session.prompt('Explain this codebase');
console.log(result.content);
```

### Terminal UI

```typescript
import { TerminalUI, ProcessTerminal, Text } from '@picro/tui';

const tui = new TerminalUI(new ProcessTerminal());

class MyUI extends ElementContainer {
  draw(context) {
    return [`Hello! Terminal width: ${context.width}`];
  }
}

tui.append(new MyUI());
tui.start();
```

### Combined (Coding Agent)

```typescript
import { createCodingAgent } from '@picro/coding-agent';

const agent = await createCodingAgent({
  model: 'claude-3.5-sonnet',
  thinkingLevel: 'medium',
});

// Agent TUI auto-starts
// Use agent.session for programmatic control
// Use agent.tui for custom UI components
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

### Scripts

```bash
# Build all packages
npm run build

# Build specific package
npm run build:tui
npm run build:agent
npm run build:llm
npm run build:memory

# Run tests
npm test
# or per package
cd packages/tui && npm test

# Watch mode
cd packages/agent && npm run dev
```

### Adding a New Package

1. Create `packages/your-package/`
2. Add `package.json`, `tsconfig.json`
3. Implement in `src/`
4. Add build/test scripts to root `package.json`

## Design Principles

- **Clean-room implementation** - No copy-paste from reference material
- **TypeScript strict** - Full type safety
- **Test coverage** - Minimum 80% coverage
- **Documentation** - API docs, examples, guides
- **Performance** - Incremental rendering, streaming, caching
- **Security** - Input sanitization, output validation

## Testing

```bash
# Run all tests
npm test

# Run specific package tests
cd packages/tui && npm test
cd packages/agent && npm test

# With coverage
npm run test:coverage
```

## License

Apache-2.0

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## Links

- [Documentation](./docs/)
- [Examples](./examples/)
- [Changelog](./CHANGELOG.md)
- [Issue Tracker](../../issues)

---

<p align="center">
Built with ❤️ for the pi ecosystem
</p>
