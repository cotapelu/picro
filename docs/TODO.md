# TODO.md – Evolution Backlog

## In Progress / Next Up

- [ ] Measure coverage, enforce ≥80%
- [ ] Enforce function length ≤20 and complexity ≤10 via lint/CI
- [ ] Document slash command API for extensions
- [ ] Add `/settings` command to tweak preferences
- [ ] Add `/tools` command to toggle built-in tools
- [ ] Implement model selection persistence across sessions

## Completed (recent)

- [x] Remove print/rpc modes, keep TTY only
- [x] Replace custom TUI with raw terminal (no readline interface)
- [x] Add slash command `/model` with interactive menu
- [x] Ensure TTY only (block pipe mode)
- [x] Refactor TTY mode into modules: InputHandler, MenuSystem, CommandProcessor, TTYMode
- [x] Create `docs/PROJECT_STATE.md` (initial)
- [x] Build passes (`npm run build`)
- [x] Add unit tests for TTY mode (23 tests passing)
- [x] Fix CLI args parser: remove legacy `--mode`, add warning for invalid thinking level
- [x] All tests passing (2276+)

## Deferred / Future

- [ ] Consider using `blessed` or `ink` if UI needs become complex
- [ ] Add telemetry opt-in
- [ ] Implement session export/import
- [ ] Multi-line input support
- [ ] Command palette search

---

*Priority order follows highest-impact, lowest-risk first.*
