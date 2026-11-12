# Evolution Plan

This outline tracks planned changes, refactors, and anticipated technical debt.

## Completed (v0.0.1+)

- **Build Stability**: Fixed missing test setup, removed obsolete copy step, all tests pass.
- **Print Mode**: Basic print mode with text/JSON output; extracts last assistant response.
- **RPC Mode**: Full JSON-RPC 2.0 implementation over stdin/stdout. Exposes agent, session, settings, auth, clipboard APIs.
- **Type Corrections**: Aligned `cycleModel` signature (`forward`/`backward`, Promise return); added optional `options` to `fork` method in runtime interface; removed private field from session interface.

## Completed (Iteration 3 - 2025-07-04)

- **Port from TTY evolution**: Runtime API simplification, trust manager exports,
  settings disabledTools, AgentSession tool methods, CLI args fixes, /theme and
  /tools commands for Ink TUI, trust-utils and truncate unit tests.
- **TUI Mode Validation**: Ink TUI boots correctly with slash commands
  (/theme, /tools, /compact, /settings, /login, /model, etc.). All imports and
  event wiring validated.
- **Build Stable**: tsc + esbuild TUI bundling working. All tests pass.

## In Progress

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


## Completed (Iteration 8 - 2025-07-05)

- **Transcript render correctness**: user text (Ink `Box` string child), tool
  result preview (VisualLinePreview.setText), bash output (missing prop wiring).
  Ba lỗi này khiến interactive mode hiển thị trống — đúng là phần "rất sơ sài".
- **API cleanup**: `VisualLinePreview` giờ có `setText()` chính thức thay cho
  mutation private field từ ngoài; hiệu năng re-render mỗi streamed chunk cũng tốt
  hơn (không tạo preview mới mỗi lần).
- **Regression tests**: `src/tui/ink/app-smoke.test.tsx` — mount App với mock
  controller, assert mọi loại transcript item đều hiển thị payload.

## Anticipated debt

- `BashExecution` vẫn giữ `outputLines` nội bộ + `append()` song song với prop;
  nên gộp thành một nguồn duy nhất khi có thời gian.
- `ChatViewport.tsx`/`MessageList.tsx` (bản cũ) còn duplicate responsibility với
  `Transcript.tsx` — nên gỡ bản cũ khỏi App để tránh hai đường render.
