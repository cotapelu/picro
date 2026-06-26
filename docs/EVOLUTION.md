# Evolution Plan

This outline tracks planned changes, refactors, and anticipated technical debt.

## Completed (v0.0.1+)

- **Build Stability**: Fixed missing test setup, removed obsolete copy step, all tests pass.
- **Print Mode**: Basic print mode with text/JSON output; extracts last assistant response.
- **RPC Mode**: Full JSON-RPC 2.0 implementation over stdin/stdout. Exposes agent, session, settings, auth, clipboard APIs.
- **Type Corrections**: Aligned `cycleModel` signature (`forward`/`backward`, Promise return); added optional `options` to `fork` method in runtime interface; removed private field from session interface.

## In Progress

- **TUI Mode Validation**: Verify interactive TUI boots correctly; fix any missing imports or event wiring.
- **Print Mode Enhancements**: Consider streaming response or full conversation output.

## Planned

- **Cancelation Support**: Allow aborting long-running agent runs via SIGINT or internal abort.
- **Model Cycling in Print Mode**: Expose cycleModel via CLI flags for headless usage.
- **Refactor AgentSessionInterface**: Clean up optional vs required, split into focused interfaces.
- **Performance Tracking**: Enable and expose metrics in print/RPC modes.
- **Unit Tests for Modes**: Add tests for print-mode and RPC mode request handling.

## Anticipated Debt

- Print mode extracts last assistant message via history scan; may miss thinking blocks. Prefer event-based capture.
- RPC mode does not yet support streaming responses; all results are wait-for-completion.
- Interface drift risk remains; need automated contract checks.

## Risk Assessment

- Low risk: Core agent loop well-tested.
- Medium risk: RPC mode may require adjustments as new features are added; integration testing needed.

