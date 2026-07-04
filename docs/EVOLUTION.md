# EVOLUTION.md

## Evolution Trajectory & Planned Refactors

### Phase 1: Foundation (Completed 2025-07-04)

**Focus:** Stabilize interactive TTY mode
**Completed:**
- Refactor TTY mode into modular structure (InputHandler, MenuSystem, CommandProcessor, TTYMode)
- Add comprehensive unit tests for TTY mode (43 tests)
- Fix CLI args compatibility (remove legacy `--mode`, add warnings for invalid thinking level)

**Outcome:** All tests passing.

---

### Phase 2: Components & Polish (Completed 2025-07-04)

**Focus:** High-end TTY UI components
**Completed:**
- Components: ConfigManager, StatusBar, enhanced InputHandler (history, multi-line, editing shortcuts), OutputRenderer (colors, markdown, spinner, progress, code blocks)
- Commands Added: `/login`, `/sessions`, `/settings`, `/tools`, `/theme`, `/compact`
- StatusBar integration: shows model, token usage, cwd, updates dynamically
- Config system: persistent, set/reset via `/settings`

**Outcome:** Professional TTY experience with rich interactivity.

---

### Phase 3: Feature Expansion (Current)

**Goals:** Already delivered most high-impact features.
**Remaining minor items:**
- `/replay` – rerun last prompt
- `/copy` – copy last response to clipboard (if supported)
- Command palette with fuzzy search

---

### Phase 4: Runtime Refactor (Later)

**Rationale:** `src/runtime/agent-session-runtime.ts` and `settings-manager.ts` are large; high complexity may cause bugs.
**Plan:** Split runtime into domain services (LLM, Tools, Settings, Events).
**Risk:** Medium – core functionality, needs comprehensive tests first.

---

### Anticipated Technical Debt

- **Menu system** may need abstraction for future UI backends (web, VS Code extension)
- **Command processor** could become plugin-based to allow user-defined slash commands
- **Settings** currently simple object; may need schema validation and migrations
- **StatusBar** rendering could be improved with real-time updates without full redraw

---

*Evolution plan revisited after each iteration.*
