# EVOLUTION.md

## Evolution Trajectory & Planned Refactors

### Phase 1: Foundation (Completed 2025-07-04)

**Focus:** Stabilize interactive TTY mode
**Completed:**
- Refactor TTY mode into modular structure (InputHandler, MenuSystem, CommandProcessor, TTYMode)
- Add comprehensive unit tests for TTY mode (31 tests)
- Fix CLI args compatibility (remove legacy `--mode`, add warnings for invalid thinking level)

**Outcome:** All tests passing, build stable.

### Phase 2: Components & Polish (Completed 2025-07-04)

**Focus:** High-end TTY UI components
**Completed:**
- Components: ConfigManager, StatusBar, enhanced InputHandler (history, multi-line, editing shortcuts), OutputRenderer (colors, markdown, spinner, progress, code blocks)
- Command `/login` added (set API key)
- Tests: 31 TTY mode tests passing

**Outcome:** Professional TTY experience ready.

### Phase 3: Feature Expansion (Current)

**Goals:** Add missing slash commands, integrate StatusBar, improve UX
**Tasks in progress:**
- `/sessions` command (list, switch, delete)
- `/tools` command (toggle built-in tools)
- `/settings` command (view/edit config)
- `/theme` command (switch color themes)
- Integrate StatusBar into TTYMode (show model, token usage)

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

**Rationale:** `src/runtime/agent-session-runtime.ts` and `settings-manager.ts` are large; high complexity may cause bugs.
**Plan:** Split runtime into domain services (LLM, Tools, Settings, Events).
**Risk:** Medium – core functionality, needs comprehensive tests first.

### Anticipated Technical Debt

- **Menu system** may need abstraction for future UI backends (web, VS Code extension)
- **Command processor** could become plugin-based to allow user-defined slash commands
- **Settings** currently simple object; may need schema validation and migrations

---

*Evolution plan revisited after each iteration.*
