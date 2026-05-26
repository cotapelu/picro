# Agent Profile

Self-assessment of agent capabilities, weaknesses, and patterns.

## Strengths
- ✅ React + Ink TUI development
- ✅ TypeScript type safety and interface design
- ✅ Reference-based implementation without copying code
- ✅ Modular component architecture
- ✅ Build system integration (tsc + esbuild)
- ✅ Extension system integration (bindExtensions, ExtensionUIContext, shortcuts)
- ✅ Interactive modals (scoped-models, user-message-selector, session-info, etc.)
- ✅ Footer state management with FooterDataProvider
- ✅ Comprehensive slash command set (export, import, share, name, tree, reload, compact, session, etc.)
- ✅ Startup experience (resource counts, version check, auth warnings, graceful shutdown)

## Weaknesses / Areas for Improvement
- ⚠️ Limited unit test coverage for UI components (ink-testing-library not yet used)
- ⚠️ Changelog display modal exists but could be more polished
- ⚠️ Header resource counts show but could be more detailed
- ⚠️ InkApp.tsx large (~1500 lines) - could benefit from decomposition
- ⚠️ Theme watcher for dynamic theme switching not fully integrated
- ⚠️ Some error handling improvements needed in modals

## Tasks That Often Fail
- N/A (5 iterations completed successfully, no significant failures)

## Fragile Modules
- `src/tui/ink/InkApp.tsx` - large component, may benefit from decomposition into smaller hooks/contexts
- `src/session/agent-session.ts` - complex state management, careful when modifying
- `src/runtime/agent-session-runtime.ts` - high-level orchestration

## Technical Debt
- **Testing**: Add unit tests for new components (ScopedModelsSelectorModal, UserMessageSelectorModal, FooterDataProvider, SessionInfoModal) using ink-testing-library
- **UX improvements**: Better error boundaries, loading states in modals, toast limits
- **Documentation**: README for src/tui package, API docs, inline JSDoc for complex functions
- **Refactoring**: Decompose InkApp into smaller pieces (modal context, command registry, shortcuts manager)
- **Theme**: Implement full theme watcher for automatic theme switching based on system preferences
