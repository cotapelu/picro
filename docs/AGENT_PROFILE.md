# Agent Profile

This document captures the agent's strengths, weaknesses, and areas needing attention.

## Strengths

- Comprehensive test suite with high coverage.
- Modular architecture with clear separation between agent core, session management, and UI layers.
- Extensible via extensions, skills, and prompt templates.

## Weaknesses / Fragile Areas

- **Interface-Implementation Drift**: Several mismatches between `AgentSessionInterface` and `AgentSession` (e.g., `cycleModel` return type, direction parameters). This caused build failures.
- **Missing Implementations**: Print and RPC modes were missing entirely; only TUI was partially implemented.
- **Circular Dependencies**: The `AgentSessionRuntime` and `AgentSession` relationship requires careful handling to avoid import cycles.
- **Type Strictness**: Overly strict interface definitions (e.g., private fields like `_extensionRunner`) created assignability issues. The interface should not expose internal private fields.
- **Build Process**: The build script referenced an obsolete file (`src/tui-bootstrap.js`), indicating infrequent maintenance of build steps.

## Task Patterns That Usually Fail

- Interface updates without synchronizing implementations.
- Incomplete minimal implementations for alternate modes (print, RPC).
- Over-reliance on dynamic imports that may fail if file structure changes.

## Recommendations

- Regularly run `npm run build` and `npm test` in CI to catch interface breaks early.
- Prefer structural typing or adjust interfaces to match concrete implementations.
- Complete print-mode and RPC-mode implementations to match TUI capabilities.
- Remove or refactor fragile private-field-in-interface exposures.
