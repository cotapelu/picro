# Agent Capability Profile

## Strengths

- Robust loop control with support for steering and follow-up messages
- Flexible tool execution (global or per-tool parallel/sequential)
- Tool result `terminate` flag for early agent loop termination
- Event-driven architecture with comprehensive logging
- Memory integration
- Continuous operation without manual resume

## Weaknesses / Known Issues

- No per-tool execution mode override (currently global only)
- Missing `prepareNextTurn` hook support (mid-run model/reasoning changes)
- No `getSteeringMessages` hook (uses queue directly)

## Fragile Modules

- `src/agent/agent-loop.ts`: Complex loop logic; careful when modifying flow.
- `src/agent/tool-executor.ts`: Caching and timeout interactions can be subtle.

## Test Coverage

- Unit tests: 1919 passing
- Integration: Moderate (TODO)
- Stress/load: None

## Languages & Stacks

- Primary: TypeScript (Node.js)
- TUI: Ink (React-based)
- LLM: OpenAI-compatible
