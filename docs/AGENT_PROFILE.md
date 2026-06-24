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
- **Test coverage >80% across all metrics (2975+ passing tests)**
- **Build stable, CI-ready**


## Weaknesses / Known Issues

- **Event type mismatch**: Streaming mode emits `turn:start`/`turn:end` while TUI listens for `message:start`/`message:end`. Non‑streaming mode works correctly. Consider aligning streaming events to `message:*` for full TUI feature parity.
- Minor: Further coverage push to 87–90% would require integration tests with real model configuration.


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
