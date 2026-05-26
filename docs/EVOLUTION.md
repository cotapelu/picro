# Evolution Log

Track trajectory changes, planned refactors, and anticipated debt.

## Trajectory Changes

### 2025-05-26 (Iteration 2)
- **Direction**: Extension System Integration
- **Change**: Implemented full `bindExtensions` with working `commandContextActions` and complete `ExtensionUIContext`
- **Rationale**: Enable extensions to fully interact with the TUI, register shortcuts, display widgets, custom headers/footers

### 2025-05-26 (Iteration 1)
- **Direction**: TUI feature completeness
- **Change**: Implemented missing UI components and modals from reference implementation
- **Rationale**: Bring TUI to feature parity with interactive-mode.ts reference without copying code

## Completed Tasks

- [x] ScopedModelsSelectorModal (modal + handler)
- [x] UserMessageSelectorModal (modal + handler)
- [x] CompactionSummaryMessage, BranchSummaryMessage, CustomMessage components
- [x] FooterDataProvider for centralized footer state management
- [x] MessageItem updates to render special message types
- [x] useRuntime converter updates to preserve special message roles
- [x] Full extension system integration (bindExtensions, commandContextActions, ExtensionUIContext)
- [x] Extension autocomplete provider registration
- [x] Custom editor component support
- [x] Build successful (TypeScript + esbuild)

## Planned Refactors

1. **InkApp decomposition** (medium risk)
   - Extract modal management into separate context/hook
   - Extract command handling into command registry pattern
   - Reduce component size (InkApp currently ~1300 lines)

2. **Message rendering pipeline** (low risk)
   - Create unified message renderer registry based on role
   - Allow extensions to register custom message renderers

3. **Footer data flow** (medium risk)
   - Already introduced FooterDataProvider - need to ensure all updates flow through it
   - Consider using React context to avoid prop drilling

4. **FooterDataProvider improvements**
   - Add git info display (branch, dirty status, ahead/behind)
   - Add extension status indicators (currently stub)

## Anticipated Debt

- **Testing debt**: No unit tests for new components; need ink-testing-library integration
- **Command handler debt**: Many handlers show "not yet implemented" (export, import, share, name, session stats, tree navigation, reload, compact)
- **Extension system debt**: Extension binding works but missing: extension shortcuts registration, showLoadedResources, startup notices, changelog display
- **Signal handlers**: Graceful shutdown (SIGTERM, SIGHUP) not implemented in TUI
- **Header resource counts**: Not yet displaying loaded extensions, skills, prompts, themes counts
- **Theme watcher**: Dynamic theme switching not fully integrated (toggle works but not persisted on reload)
- **Error handling**: Modal error states and toast limits could be improved
- **Documentation debt**: README for src/tui package, API docs, inline JSDoc

## Risk Mitigation

- Build passes after each change (verified)
- Use React patterns consistent with existing codebase
- Preserve backward compatibility with AgentSessionRuntimeInterface
- Incremental commits and evolution tracking
- Keep changes small and focused per iteration
