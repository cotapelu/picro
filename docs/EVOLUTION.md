# Evolution Plan

This outline tracks planned changes, refactors, and anticipated technical debt.

## Completed (v0.0.1+)

- **Print Mode Implementation**: Basic print mode that sends messages and prints last assistant response. Supports text and JSON output.
- **RPC Mode Stub**: Placeholder for future JSON-RPC over stdio.
- **Type Corrections**: Aligned `cycleModel` signature; removed private field from interface.
- **Build Stability**: Fixed missing test setup and removed obsolete copy step.

## In Progress

- **TUI Mode Completion**: The interactive TUI imports `./app-events.js` which exists (as `.ts`) but may need runtime checks. Need to verify TUI boots correctly.
- **Prompt Mode Enhancements**: Currently print-mode only prints the last assistant response. Consider streaming output or full conversation export.

## Planned

- **RPC Mode Implementation**: Implement JSON-RPC protocol on stdin/stdout for external tool integration.
- **Print Mode Streaming**: Add option to stream responses as they arrive, not just final.
- **Cancelation Support**: Allow aborting long-running agent runs via SIGINT or internal abort.
- **Model Cycling in Print Mode**: Expose cycleModel via CLI flags or environment for testing.
- **Refactor AgentSessionInterface**: Clean up optional vs required methods, possibly split into smaller interfaces.
- **Performance Tracking**: Enable and expose metrics collection in print mode.

## Anticipated Debt

- The quick fix for `cycleModel` return type may cause issues if UI expects a non-Promise (older sync style). Should consider converting interface to Promise or keep async consistent.
- Print mode uses a hack to extract last assistant message from history; this may miss multi-block thinking output. A better approach is to capture via events.

## Risk Assessment

- Low risk: Existing test suite guards core agent loop.
- Medium risk: Print mode implementation may need adjustments once TUI is stable.
