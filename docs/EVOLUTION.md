# EVOLUTION.md

## Evolution Trajectory & Planned Refactors

### Phase 1: Foundation (Current)

**Focus:** Stabilize interactive TTY mode  
**Completed:** Refactor TTY mode into modular structure  
**Next:**
- Add unit tests for TTY mode components
- Measure coverage, enforce ≤20 lines/func, complexity ≤10
- Add error handling tests and improve resilience

### Phase 2: Test & Harden (Upcoming)

**Goals:** Coverage ≥80%, zero known bugs in interactive flow  
**Tasks:**
- Write tests for `InputHandler`, `MenuSystem`, `CommandProcessor`
- Test `/model` command with mock model registry
- Test event subscriptions and output rendering
- Add CI linting for complexity gates

### Phase 3: Extend Features (After Phase 2)

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
