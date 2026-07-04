# AGENT_PROFILE.md

## Weaknesses & Failure Patterns

### Commonly Failing Tasks (Improved)

- **TTY mode** – Now unit-tested; input handling stable
- **CLI args parsing** – Legacy flags (`--mode`) removed; thinking level validation added

### Fragile Modules (High Change Frequency)

- `src/runtime/agent-session-runtime.ts` – Large, complex, may need split
- `src/session/` – Model registry and session storage tight coupling

### Stack Weaknesses

- TypeScript strict mode occasionally surfaces implicit any; requires careful typing
- Lack of unit tests in some runtime paths (coverage target: 80%)

### Improvement Focus

- Increase unit test coverage for runtime modules
- Refactor large runtime modules to reduce complexity
- Add integration tests for slash command execution
- Implement end-to-end terminal simulation tests

---

*Profile updates after each evolution round.*
