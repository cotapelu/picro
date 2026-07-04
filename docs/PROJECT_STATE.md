# PROJECT_STATE.md

## High-Level Overview

**Project:** `picro` – AI coding agent CLI  
**Tech Stack:** TypeScript, Node.js, custom TTY (raw terminal)  
**Architecture:** Session-based agent runtime với LLM providers, tools, và interactive TUI.

## Current State (as of 2025-07-04)

### Components

- `src/agent/` – Core agent loop, tool executor, context manager
- `src/session/` – Session storage, model registry, auth
- `src/runtime/` – AgentSessionRuntime, settings, resource loader, diagnostics
- `src/tools/` – Built-in tools (read, write, edit, bash, grep, find, ls)
- `src/tty-mode/` – Interactive TTY mode (recently refactored from monolithic `main.ts`)

### CLI Modes

Only TTY mode supported (no print/json/rpc).  
Entry: `src/main.ts` → creates runtime → `TTYMode.start()`.

### Slash Commands (TTY)

- `/model` – List and select model from registry
- `/help` – Show help
- `/quit` / `/exit` – Exit

### Known Issues / Tech Debt

1. ✅ `src/tty-mode` refactored into modules (InputHandler, MenuSystem, CommandProcessor, TTYMode)
2. Lack of unit tests for TTY mode
3. Command error handling basic
4. Need coverage ≥80%
5. Some modules in `src/runtime/` are large – future refactor candidate

### Metrics (post-evolution round 1)

- Build: ✅ Pass (`npm run build`)
- Tests: Pending (unit tests for TTY mode to be added)
- Coverage: Unknown
- Complexity: Modules split; functions mostly ≤20 lines in `src/tty-mode/`

### Dependencies

- `@earendil-works/pi-coding-agent` (core)
- `openai`, Anthropic, Google providers
- `ink` (no longer used), `readline` (raw mode)

---

## Next Steps (Prioritized)

1. ✅ Refactor TTY mode (completed)
2. Add unit tests for TTY mode (InputHandler, MenuSystem, CommandProcessor)
3. Measure coverage, enforce complexity gates
4. Add tests for command handlers
5. Consider refactoring large runtime modules if complexity high

---

*Last updated: 2025-07-04 – Initial state capture before evolution round.*
