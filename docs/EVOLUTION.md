# Evolution Log

Track trajectory changes, planned refactors, and anticipated debt.

## Trajectory Changes

### 2025-05-26 (Iteration 6)
- **Direction**: Visible Feature Completion
- **Change**: Git info in Footer (branch, dirty, ahead/behind), Tree summarization options modal (no/summary/custom), Changelog modal content, Session selector improved
- **Rationale**: Polish UI elements that users see regularly

### 2025-05-26 (Iteration 5)
- **Direction**: Startup Experience & Visibility
- **Change**: Implemented showLoadedResources (toast + Header counts), extension shortcuts registration, graceful shutdown (SIGTERM/SIGHUP), Anthropic auth warning
- **Rationale**: Improve startup feedback, extension usability, and process management

### 2025-05-26 (Iteration 4)
- **Direction**: Remaining Slash Commands
- **Change**: Completed all slash commands: /export, /import, /share, /name, /tree, /reload, /compact, /session (enhanced)
- **Rationale**: Bring all core user commands to full functionality

### 2025-05-26 (Iteration 3)
- **Direction**: Command Handlers Implementation
- **Change**: Implemented groundwork and initial handlers
- **Rationale**: Complete slash command functionality

### 2025-05-26 (Iteration 2)
- **Direction**: Extension System Integration
- **Change**: Full `bindExtensions`, `commandContextActions`, `ExtensionUIContext`
- **Rationale**: Enable extensions to fully interact with TUI

### 2025-05-26 (Iteration 1)
- **Direction**: TUI feature completeness
- **Change**: Missing UI components and modals from reference
- **Rationale**: Feature parity with interactive-mode.ts

## Completed Tasks

- [x] ScopedModelsSelectorModal
- [x] UserMessageSelectorModal
- [x] CompactionSummaryMessage, BranchSummaryMessage, CustomMessage components
- [x] FooterDataProvider
- [x] MessageItem special role rendering
- [x] useRuntime role preservation
- [x] Extension system (bindExtensions, commandContextActions, ExtensionUIContext)
- [x] Extension autocomplete provider registration
- [x] Custom editor component support
- [x] /session, /reload, /compact
- [x] showLoadedResources (toast + Header)
- [x] Extension shortcuts registration
- [x] Graceful shutdown (SIGTERM/SIGHUP)
- [x] Anthropic auth warning
- [x] Git info in Footer (branch, dirty, ahead/behind)
- [x] Tree summarization options modal
- [x] Changelog modal content
- [x] Session selector improvements
- [x] Build successful
- [x] 38 tasks completed across 6 iterations

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
