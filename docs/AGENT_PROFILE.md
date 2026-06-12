# Agent Capability Profile

## Strengths

- Robust loop control with support for steering and follow-up messages
- Flexible tool execution (global or per-tool parallel/sequential)
- Per-tool execution mode override (sequential within parallel batch)
- Tool result `terminate` flag for early agent loop termination
- Event-driven architecture with comprehensive logging
- Memory integration
- Continuous operation without manual resume
- Dynamic reasoning adjustment via `prepareNextTurn` hook (tested)
- Dynamic steering injection via `getSteeringMessages` hook (supported)

## Weaknesses / Known Issues


## Fragile Modules

- `src/agent/agent-loop.ts`: Complex loop logic; careful when modifying flow.
- `src/agent/tool-executor.ts`: Caching and timeout interactions can be subtle.

## Test Coverage

- Unit tests: 2029+ passing
- Integration: Moderate (TODO)
- Stress/load: None

## Languages & Stacks

- Primary: TypeScript (Node.js)
- TUI: Ink (React-based)
- LLM: OpenAI-compatible
