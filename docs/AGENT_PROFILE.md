# Agent Profile

This document captures the agent's strengths, weaknesses, and areas needing attention.

## Strengths

- Comprehensive test suite with high coverage.
- Modular architecture with clear separation between agent core, session management, and UI layers.
- Extensible via extensions, skills, and prompt templates.

## Weaknesses / Fragile Areas

- **Interface-Implementation Drift**: Mostly resolved — AgentSessionRuntime now delegates directly to AgentSession, removing interface drift. Still requires vigilance when adding new methods.
- **Partial Implementations**: Print and RPC modes fully implemented. Ink TUI mode validated with core slash commands. Coverage gaps remain in edge cases for alternate modes.
- **Circular Dependencies**: The `AgentSessionRuntime` and `AgentSession` relationship requires careful handling to avoid import cycles.
- **Type Strictness vs Practicality**: Interfaces sometimes expose internal fields unnecessarily or omit optional parameters, leading to friction.
- **Build Process**: Build pipeline working correctly (tsc + esbuild TUI bundling).

## Task Patterns That Usually Fail

- Interface updates without synchronizing implementations.
- Incomplete implementations for alternate modes.
- Over-reliance on dynamic imports without fallbacks.

## Recommendations

- Regularly run `npm run build` and `npm test` in CI.
- Keep interfaces aligned with actual class signatures; include optional parameters where needed.
- Validate all modes (text, json, rpc, tui) in integration tests.
- Consider splitting large interfaces into smaller, role-specific ones.

