# EVOLUTION.md

## Evolution Trajectory & Planned Refactors

### Phase 1: Foundation (Completed 2025-07-04)

**Focus:** Stabilize interactive TTY mode
**Completed:**
- Refactor TTY mode into modular structure (InputHandler, MenuSystem, CommandProcessor, TTYMode)
- Add comprehensive unit tests for TTY mode (23 tests)
- Fix CLI args compatibility (remove legacy `--mode`, add warnings for invalid thinking level)

**Outcome:** All tests passing (2276+), build stable, coverage improved.

### Phase 2: Test & Harden (Current)

**Goals:** Coverage ≥80% across codebase, enforce complexity gates
**Tasks in progress:**
- Measure coverage of TTY mode (high)
- Enforce function length ≤20 and complexity ≤10 via lint/CI
- Add error handling tests for command execution
- Add integration tests for slash command execution

### Phase 3: Extend Features (Next)

**High-impact features:**
- `/settings` command to configure preferences
- `/tools` command to toggle tool availability
- Command palette search (fuzzy find)
- Model selection persistence across sessions

### Phase 4: Runtime Refactor (Later)

**Rationale:** `src/runtime/agent-session-runtime.ts` and `settings-manager.ts` are large; high complexity may cause bugs.
**Plan:** Split runtime into domain services (LLM, Tools, Settings, Events).
**Risk:** Medium – core functionality, needs comprehensive tests first.

### Anticipated Technical Debt

- **Menu system** may need abstraction for future UI backends (web, VS Code extension)
- **Command processor** could become plugin-based to allow user-defined slash commands
- **Settings** currently simple object; may need schema validation and migrations

---

*Evolution plan revisited after each iteration.*
