# TODO – Picro Agent Evolution

## Completed (Current Round)

- [x] Fix missing `src/tui/ink/test-setup.ts` causing test failures
- [x] Implement `src/modes/print-mode.ts` (basic text/JSON output)
- [x] Implement `src/modes/rpc-mode.ts` stub
- [x] Add `prompt` method to `AgentSessionRuntime`
- [x] Extend `InteractiveModeOptions` with `initialState`
- [x] Fix `setInputValue` to handle string updates correctly
- [x] Align `cycleModel` signature (`forward`/`backward`, return Promise)
- [x] Remove `_extensionRunner` from `AgentSessionInterface`
- [x] Remove obsolete `cp src/tui-bootstrap.js dist/` from build script
- [x] Implement full JSON-RPC 2.0 mode (stdin/stdout) with comprehensive method coverage
- [x] Update `AgentSessionRuntimeInterface.fork` to include optional `options` parameter

## Next Priorities

- [ ] Test TUI mode startup and fix any `app-events` issues
- [ ] Add streaming output support to print mode
- [ ] Add cancelation (abort) signal handling for agent runs
- [ ] Add CLI flag to cycle model (forward/backward) in print mode
- [ ] Formalize error handling in runPrintMode
- [ ] Add performance metrics exposure

## Follow-ups

- [ ] Write unit tests for RPC mode (request handling, error cases)
- [ ] Document available CLI options and modes
- [ ] Add integration test for end-to-end text mode
- [ ] Review other interface mismatches (e.g., optional fields like `getPerformanceStats`)

