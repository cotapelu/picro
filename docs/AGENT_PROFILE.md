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


## Update (Iteration 8 - 2025-07-05)

- **Weak spot confirmed**: Ink semantics chi tiết (bare string child trong `<Box>`
  làm rỗng subtree) không được phát hiện bởi typecheck — chỉ test render mới thấy.
  → Từ nay mọi component có render string phải có test `ink-testing-library`.
- **Weak spot confirmed**: prop khai báo trong interface nhưng không destructure
  (`BashExecution.output`) — `tsc` không cảnh báo. → Bổ sung noiUnusedLocals và
  test cho mỗi component với đầy đủ props.
- **Fragile module**: `components/ToolExecution.tsx` — preview state + cache dễ hỏng
  im lặng; cần test streaming chunk trước khi merge.
- **Strength giữ vững**: audit+bisect có hệ thống (repro → isolate → root cause →
  regression test) đã tìm ra 3 bug render nghiêm trọng trong 1 vòng.
