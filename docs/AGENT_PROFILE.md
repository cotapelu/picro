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
- **Test coverage >90% across all metrics (2999+ passing tests)**
- **Build stable, CI-ready**


## Weaknesses / Known Issues

- Memory injection (when enabled) can cause token explosion if global memory storage contains many entries; default now disabled to prevent this.
- `ContextBuilder` memory injection logic previously lacked proper token accounting for large memory sets; fixed in Round 110.
- `AgentLoop` complexity remains high despite test coverage; careful when modifying loop flow.


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
