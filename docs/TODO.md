# TODO.md – Evolution Backlog

## In Progress / Next Up

- [ ] Integrate StatusBar into TTYMode (show model, token usage, cwd)
- [ ] Measure coverage, enforce ≥80%
- [ ] Enforce function length ≤20 and complexity ≤10 via lint/CI

## Completed (recent)

- [x] Remove print/rpc modes, keep TTY only
- [x] Replace custom TUI with raw terminal (no readline interface)
- [x] Add slash command `/model` with interactive menu
- [x] Ensure TTY only (block pipe mode)
- [x] Refactor TTY mode into modules + components/ (InputHandler, MenuSystem, CommandProcessor, PromptLine, OutputRenderer, ConfigManager, StatusBar)
- [x] Create `docs/PROJECT_STATE.md` (initial)
- [x] Build passes (`npm run build`)
- [x] Add unit tests for TTY mode (41 tests passing)
- [x] Fix CLI args parser: remove legacy `--mode`, add warning for invalid thinking level
- [x] All tests passing (2308+)
- [x] Add `/login` command (set API key)
- [x] OutputRenderer: colors, markdown, spinner, progress, code blocks
- [x] InputHandler: multi-line, history, editing shortcuts, persistent history
- [x] ConfigManager: persistent config, set/reset
- [x] Add `/sessions` command (list, switch)
- [x] Add `/settings` command (view/edit config)
- [x] Add `/tools` command (toggle built-in tools)
- [x] Add `/theme` command (switch color themes)

## Deferred / Future

- [ ] Consider using `blessed` or `ink` if UI needs become complex
- [ ] Add telemetry opt-in
- [ ] Implement session export/import
- [ ] Multi-line input support (already enabled via config)
- [ ] Command palette search (fuzzy find)

---

*Priority order follows highest-impact, lowest-risk first.*
