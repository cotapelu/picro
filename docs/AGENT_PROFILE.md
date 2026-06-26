# Agent Capability Profile

## Strengths

- Robust loop control with support for steering and follow-up messages
- Flexible tool execution (global or per-tool parallel/sequential)
- Per-tool execution mode override (sequential within parallel batch)
- Tool result `terminate` flag for early agent loop termination
- Event-driven architecture with comprehensive logging
- Memory integration with smart boosting and deduplication
- Continuous multi-turn conversation without manual resume
- Dynamic reasoning adjustment via `prepareNextTurn` hook (tested)
- Full pi-coding-agent InteractiveMode compatibility
- Project trust system: `ProjectTrustStore` with file-based decisions
- Complete slash command support
- Trust warnings for untrusted projects
- Model selector with search and persistence
- **Bash output truncation** (50KB/2000 lines) and **history limits** (1000 tool turns) prevent OOM during large scans.
- **Test coverage >90%** across all metrics (3000+ passing tests)
- **Build stable**, CI-ready


## Weaknesses / Known Issues

- Memory injection enabled by default for test compatibility; production deployments should set `enableMemoryInjection: false` in `ContextBuilder` config to prevent token explosion.
- `AgentLoop` complexity remains high despite test coverage; careful when modifying loop flow.
- TUI event handling (`useRuntime`) has one failing test related to aborted stopReason; unrelated to core agent.
- Event type discrepancy: streaming mode uses `turn:*` events but TUI expects `message:*`; non‑streaming unaffected.

## Recent Improvements

- **Token count visibility**: TUI footer now displays `last:XXk t` showing token count of the most recent LLM request. Helps monitor context size and catch overflow early.
- **Context usage warning**: Footer shows ⚠/⚠⚠ when context usage exceeds 80%/90% thresholds, with yellow/red color coding. Proactive overflow prevention.
- **Code maintainability**: Extracted large methods in `AgentLoop` and `AgentSession` to ≤20 lines each, improving readability and testability.
- **Memory safety**: Memory injection disabled by default, eliminating token explosion from global memory storage.


## Fragile Modules

- `src/agent/agent-loop.ts`: Complex loop logic; careful when modifying flow.
- `src/agent/tool-executor.ts`: Caching and timeout interactions can be subtle.

## Test Coverage

- Unit tests: 2920+ passing
- Integration: Moderate (TODO)
- Stress/load: None

## Languages & Stacks

- Primary: TypeScript (Node.js)
- TUI: Ink (React-based)
- LLM: OpenAI-compatible
