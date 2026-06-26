# Agent Profile

This document captures the agent's strengths, weaknesses, and areas needing attention.

## Strengths

- Comprehensive test suite with high coverage.
- Modular architecture with clear separation between agent core, session management, and UI layers.
- Extensible via extensions, skills, and prompt templates.

## Weaknesses / Fragile Areas

- **Interface-Implementation Drift**: Mismatches between interfaces and concrete classes (e.g., `cycleModel` return type, `fork` options parameter). This causes build failures and needs constant vigilance.
- **Partial Implementations**: Until recently, print and RPC modes were missing; TUI is still not fully validated. Coverage gaps in non-default modes.
- **Circular Dependencies**: The `AgentSessionRuntime` and `AgentSession` relationship requires careful handling to avoid import cycles.
- **Type Strictness vs Practicality**: Interfaces sometimes expose internal fields unnecessarily (`_extensionRunner`) or omit optional parameters, leading to friction.
- **Build Process**: Outdated steps (obsolete file copy) suggest infrequent execution of full build pipeline.

## Task Patterns That Usually Fail

- Interface updates without synchronizing implementations.
- Incomplete implementations for alternate modes.
- Over-reliance on dynamic imports without fallbacks.

## Recommendations

- Regularly run `npm run build` and `npm test` in CI.
- Keep interfaces aligned with actual class signatures; include optional parameters where needed.
- Validate all modes (text, json, rpc, tui) in integration tests.
- Consider splitting large interfaces into smaller, role-specific ones.

