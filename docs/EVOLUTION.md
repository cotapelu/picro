# Evolution Log

Track trajectory changes, planned refactors, and anticipated debt.

## Trajectory Changes

### 2025-05-26 (Iteration 1)
- **Direction**: TUI feature completeness
- **Change**: Implemented missing UI components and modals from reference implementation
- **Rationale**: Bring TUI to feature parity with interactive-mode.ts reference without copying code

## Planned Refactors

1. **InkApp decomposition** (medium risk)
   - Extract modal management into separate context/hook
   - Extract command handling into command registry pattern
   - Reduce component size from ~1300 lines to smaller pieces

2. **Message rendering pipeline** (low risk)
   - Create unified message renderer registry based on role
   - Allow extensions to register custom message renderers

3. **Footer data flow** (medium risk)
   - Already introduced FooterDataProvider - need to ensure all updates flow through it
   - Consider using React context to avoid prop drilling

## Anticipated Debt

- **Testing debt**: No unit tests for new components; need to ink-testing-library
- **Extension system debt**: bindExtensions stub; full integration pending
- **Command handler debt**: Many handlers show "not yet implemented" messages
- **Documentation debt**: Need README for src/tui package, API docs

## Risk Mitigation

- Build passes after each change (verified)
- Use React patterns consistent with existing codebase
- Preserve backward compatibility with AgentSessionRuntimeInterface
- Incremental commits and evolution tracking
