# Agent Metrics

Track agent performance and reliability across iterations.

## Current Metrics (as of 2025-05-29)

| Metric | Value |
|--------|-------:|
| Total Iterations | 62 |
| Tasks Completed | 109 |
| Test Failure Rate | 0% |
| Rollback Count | 0 |
| Regressions | 0 |
| MTTR (Mean Time To Recover) | N/A |
| Build Success Rate | 100% |
| Test Pass Rate | 100% (724 tests) |
| Coverage (overall) | ~48.3% |
| Coverage (key modules): |
| - loop-strategy.ts | 93.33% |
| - message-queue.ts | ~98% |
| - pi-ai-shim.ts | 100% |
| - overflow.ts | ~95% |
| - event-emitter.ts | ~80% |
| - models.ts | 100% |
| - agent-loop.ts | ~72% |
| - InputBox.tsx | ~68% |
| - session-manager.ts | ~75% |
| - convert-to-llm.ts | 100% |
| - paths.ts | 100% |
| - compaction.ts | ~85% |

## History

| Date | Iteration | Tasks | Build Status | Notes |
|------|-----------|-------|--------------|-------|
| 2025-05-29 | 62 | 20 | ✅ | **InputBox Test Coverage Expansion:** Added 20 comprehensive unit tests covering rendering (placeholder, value, slash mode, unicode, long input), disabled state, submission (Enter with/without value), backspace handling, arrow keys navigation, Home/End (Ctrl+A/E), slash command detection, autocomplete (Tab), kill ring (Ctrl+K/Y), and edge cases. InputBox.tsx coverage increased from ~13% to ~68%. Overall coverage ~48.3%, tests 724 passing.
|------|-----------|-------|--------------|-------|
| 2025-05-29 | 61 | 24 | ✅ | AgentLoop coverage boost: added 24 comprehensive unit tests covering reset, transformContext, memoryStore (success/failure), steering queue, initialTurns, autoSaveMemory, turn creation, drainQueue, combineSignals, transformPrompt, max rounds, debug emissions, shouldContinue, signal integration, toolCallId, consecutive runs, and snapshot integrity. Overall coverage ~48.22%, agent-loop.ts ~72%.
| 2025-05-28 | 50 | 1 | ✅ | Compaction Utilities Tests: unit tests for compaction.ts (13 tests) covering estimateTokens, shouldCompact, file ops tracking, and formatting |
| 2025-05-28 | 51 | 2 | ✅ | Integrated command-handlers (handleSelectCommand) and fixed manual slash command handling; fixed parseArgs bugs; all 572 tests passing |
| 2025-05-28 | 49 | 1 | ✅ | Paths Utils Tests: unit tests for paths.ts (9 tests) covering isLocalPath prefixes, whitespace, and case sensitivity |
| 2025-05-28 | 48 | 1 | ✅ | Skills Format Tests: unit tests for formatSkillsForPrompt (4 tests) covering empty array, disabled filtering, XML formatting, and ordering |
| 2025-05-28 | 47 | 1 | ✅ | ConvertToLlm Test Coverage: comprehensive unit tests for convert-to-llm.ts (12 tests), covering all message conversion paths (bashExecution, branchSummary, compactionSummary, custom) to 100% coverage |
| 2025-05-28 | 46 | 1 | ✅ | SessionManager Test Coverage: comprehensive unit tests for session-manager.ts (31 tests), covering CRUD, tree, export/import, and bug fix in importSession (~75% coverage) |
| 2025-05-28 | 44 | 1 | ✅ | SourceInfo Tests: added unit tests for source-info.ts |
| 2025-05-28 | 45 | 1 | ✅ | AgentLoop Tests: expanded coverage for agent-loop.ts with tool calls, errors, and abort scenarios (~55% coverage) |
| 2025-05-28 | 43 | 1 | ✅ | Compat Detection Tests: added unit tests for compat-detection.ts |
| 2025-05-28 | 42 | 1 | ✅ | JSON Parse Tests: added unit tests for json-parse.js |
| 2025-05-28 | 41 | 1 | ✅ | Settings Validator Tests: added tests for settings-validator.ts |
| 2025-05-28 | 40 | 1 | ✅ | Auth Guidance Tests: added tests for auth-guidance.ts |
| 2025-05-28 | 39 | 1 | ✅ | System Prompt Tests: comprehensive tests for system-prompt.ts |
| 2025-05-28 | 38 | 1 | ✅ | Models Tests: unit tests for model lookup and cost calculation |
| 2025-05-28 | 37 | 1 | ✅ | Event Stream Tests: added tests for AssistantMessageEventStream |
| 2025-05-28 | 36 | 1 | ✅ | Overflow Tests: truncateContext, smartTruncate tests |
| 2025-05-28 | 35 | 1 | ✅ | Event Emitter Tests: added tests and improved error handling |
| 2025-05-28 | 34 | 1 | ✅ | Overflow Tests: added comprehensive unit tests for `overflow.ts` (12 test cases), coverage increased to 33.3% overall, overflow ~95% |
| 2025-05-28 | 33 | 1 | ✅ | Diagnostics Tests: added tests for `diagnostics.ts` (30 test cases), coverage increased to 32.58% overall |
| 2025-05-28 | 32 | 1 | ✅ | Pi-ai-shim Tests: added defensive null check and tests (8 test cases), coverage increased to 31.7% overall, pi-ai-shim 100% |
| 2025-05-28 | 31 | 1 | ✅ | MessageQueue Tests: added comprehensive unit tests (31 test cases), coverage increased to 31.56% overall, message-queue ~98% |
| 2025-05-28 | 30 | 1 | ✅ | Loop Strategy Tests: added comprehensive unit tests (63 test cases), coverage increased to 31.19% overall, loop-strategy 93.33% |
| 2025-05-26 | 10 | 2 | ✅ | Test Coverage Expansion: added MessageItem.test.tsx (13 tests), coverage increased to 29.46% overall, MessageItem 74.32% |
| 2025-05-26 | 9 | 1 | ✅ | Critical Bug Fix: corrected `shouldShowRole` to `showRoleLabel` in MessageItem.tsx |
| 2025-05-26 | 8 | 8 | ✅ | InkApp Refactoring Analysis: extraction plan, command-handlers.ts & modal-renderers.tsx created (integration deferred) |
| 2025-05-26 | 7 | 7 | ✅ | Testing Infrastructure: setup, FooterDataProvider tests, 152 passing |
| 2025-05-26 | 6 | 5 | ✅ | Visible features: git info, tree summarization, changelog, session selector |
| 2025-05-26 | 5 | 6 | ✅ | Startup Experience: showLoadedResources, extension shortcuts, signal handlers, Anthropic auth |
| 2025-05-26 | 4 | 5 | ✅ | Slash commands: /export, /import, /share, /name, /tree, /reload, /compact, /session |
| 2025-05-26 | 3 | 9 | ✅ | Command Handlers groundwork |
| 2025-05-26 | 2 | 5 | ✅ | Extension System Integration |
| 2025-05-26 | 1 | 8 | ✅ | TUI Enhancement Sprint |
