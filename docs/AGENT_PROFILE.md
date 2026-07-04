# AGENT_PROFILE.md

## Weaknesses & Failure Patterns

### Commonly Failing Tasks

- **TTY mode input handling** – Historically fragile with raw mode and key sequences
- **Menu rendering** – Cursor movement and ANSI codes often buggy across terminals
- **Command registration** – Risk of circular dependencies between modules

### Fragile Modules (High Change Frequency)

- `src/tty-mode/` – Recently rewritten; still evolving
- `src/runtime/agent-session-runtime.ts` – Large, complex, may need split
- `src/session/` – Model registry and session storage tight coupling

### Stack Weaknesses

- TypeScript strict mode occasionally surfaces implicit any; requires careful typing
- Node.js stream compatibility issues (stdin raw mode vs readline)
- Lack of unit tests in critical interactive paths

### Improvement Focus

- Increase unit test coverage for TTY mode (target ≥80%)
- Refactor large runtime modules to reduce complexity
- Add integration tests for slash command execution
- Implement end-to-end terminal simulation tests

---

*Profile updates after each evolution round.*
