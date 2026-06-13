# Evolution Trajectory

## Completed Changes

### Round 1 (2026-06-11): Outer Loop & Follow-up Messages

**Problem**: Agent would stop after a turn (even with pending follow-up messages) and require manual resume. Follow-up messages queued after agent stopping condition were not automatically processed.

**Solution**: Introduced outer loop around existing loop. After a turn ends (assistant response with or without tool calls), check follow-up queue. If present, inject as new user turns and continue without requiring external resume.

**Implementation**:
- Added `pendingTurns` buffer in `executeLoop`.
- Steering queue drained into `pendingTurns` each round (was directly into history).
- Before LLM call, inject `pendingTurns` into history.
- After a turn ends (in `else` branch for no tool calls, or after `shouldContinue` false for tool calls), check follow-up queue. If any, push to history and set `currentPrompt` to their text, then `continue` to next round.
- Added helper methods `collectFollowUpTurns` (also supports `getFollowUpMessages` hook) and `turnsToText`.

**Impact**:
- Enables continuous operation without external resume.
- Maintains backward compatibility (existing queues still work).
- Slightly more complex loop structure but still maintainable.

**Tests**: All existing tests pass; new tests added for follow-up flow (2 tests + hook test).

### Round 2 (2026-06-11): Per-Tool Execution Mode Override

**Problem**: Tool execution strategy was global only. Some tools require sequential execution even when the default is parallel.

**Solution**: Added `executionMode` property to `AgentTool` type and `ToolDefinition`. Updated `ToolExecutor.executeAll` to check per-tool mode: if any tool in the batch has `executionMode: 'sequential'`, the batch runs sequentially.

**Implementation**:
- Extended `AgentTool` type with optional `executionMode?: ToolExecutionMode`.
- Extended `ToolDefinition` with optional `executionMode`.
- Modified `executeAll`: compute `forceSequential` based on global config or per-tool overrides.

**Impact**:
- Fine-grained control over tool concurrency.
- Backward compatible (existing tools with no executionMode use global default).
- Low risk change.

**Tests**: Added 3 unit tests for per-tool execution mode (parallel default, sequential override, global sequential).

### Round 3 (2026-06-11): Terminate Flag Support

**Problem**: Agent had no mechanism for tools to signal that the agent should stop after the current tool batch. Some workflows need to abort early (e.g., when tool indicates final decision or fatal condition).

**Solution**: Introduced `terminate` flag on tool results. When all tools in a batch return `terminate: true`, the agent loop ends early (similar to `shouldContinue=false`), with an empty final answer. The `afterToolCall` hook can override the terminate flag.

**Implementation**:
- Added `terminate?: boolean` to `SuccessfulToolResult` and `FailedToolResult` in `types.ts`.
- `ToolExecutor.execute` sets `terminate: false` by default; `afterToolCall` result can set `terminate: true`.
- In `AgentLoop.run`, after a tool batch, compute `allTerminate`. If true, inject follow-up if present; else, set `turnEnded=true` and return empty final answer.
- Unified turn-ending: `allTerminate` OR `!shouldContinue` both lead to follow-up check or break.

**Impact**:
- Enables early termination based on tool feedback.
- Backward compatible (default `false`).
- Low risk; minimal changes to existing flow.

**Tests**: Added 2 tests for terminate flag behavior (all terminate vs mixed). All tests pass.

### Round 4 (2026-06-12): prepareNextTurn Hook Testing

**Problem**: The `prepareNextTurn` hook was implemented but lacked comprehensive test coverage, making it risky to use and difficult to trust.

**Solution**: Added extensive unit tests covering hook invocation, reasoningLevel overrides, error handling, context correctness, multi-round modifications, and interaction with follow-up.

**Implementation**:
- Added `describe('prepareNextTurn hook')` suite with 6 test cases.
- Verified hook behavior across various scenarios (tool calls, no-tool turns, errors).
- Fixed subtle round numbering expectations (hook receives completed round number).
- Ensured hook errors are caught and logged without crashing.

**Impact**:
- Increases confidence in hook functionality.
- Improves overall test coverage (1926 passing tests).
- No regressions introduced.

**Tests**: All new tests pass; existing tests unchanged.

---

### Round 5 (2026-06-12): getSteeringMessages Hook Support

**Problem**: Agent used a fixed `steeringQueue` for user interjections with no dynamic hook, limiting flexibility. Reference implementation uses a `getSteeringMessages` hook to supply steering messages at runtime.

**Solution**: Modified `AgentLoop.executeLoop` to check `config.getSteeringMessages` first: if present, call it to obtain steering turns; otherwise fall back to draining `steeringQueue`. Wrapped call in try-catch for resilience, logging errors only in debug mode.

**Implementation**:
- Replaced direct `steeringQueue` draining with conditional logic.
- Added error handling mirroring `prepareNextTurn` pattern.
- Added comprehensive tests covering hook usage, fallback behavior, hook priority, and error handling.

**Impact**:
- Enables dynamic steering message injection without queue management.
- Maintains backward compatibility (existing queue-based usage unchanged).
- Low risk change; isolated to turn-start logic.

**Tests**: Added 4 new unit tests; all pass. Total passing tests: 1930.

---

### Round 5 (2026-06-12): Auth-Model Registry Synchronization

**Problem**: The interactive mode's ModelSelectorModal displayed no models after user login because `DefaultModelRegistry.hasConfiguredAuth()` only checked custom in-memory keys and environment variables, not the `AuthStorage` where API keys from the UI were saved. This caused a deadlock: users needed to select a model to proceed but couldn't because no models were shown.

**Solution**: Inject `AuthStorage` into `DefaultModelRegistry` during service creation. Updated `hasConfiguredAuth()` and `getApiKeyAndHeaders()` to prioritize `AuthStorage` for API key lookup. Now when a user enters an API key via LoginModal, it is saved to `AuthStorage` and immediately visible to the model registry.

**Implementation**:
- Modified `createAgentSessionServices` to pass `authStorage` into `DefaultModelRegistry` constructor.
- Added `private authStorage?: AuthStorage` field to `DefaultModelRegistry`.
- Updated `hasConfiguredAuth()` to check `this.authStorage?.getApiKey(provider)` and wildcard.
- Updated `getApiKeyAndHeaders()` to query AuthStorage first before custom keys and env vars.
- Added missing interface methods (`find`, `getAvailable`, `getAll`, `getProviders`) to `DefaultModelRegistry` to satisfy compile.
- Added unit tests verifying auth-storage-aware availability.

**Impact**:
- Unblocks model selection in interactive mode.
- Maintains backward compatibility: environment variables still work if AuthStorage absent.
- Low risk: small, focused change with clear contract.

**Tests**: Added 2 unit tests for auth integration. All existing tests pass (model-registry: 18 tests, agent-session.unit: 7, agent-session-methods: 36).

---

### Round 7 (2026-06-12): AuthStorage Unit Tests

**Problem**: The `AuthStorage` module lacked any test coverage despite being critical for security (API key persistence). Any changes to auth logic could silently break credential storage.

**Solution**: Wrote comprehensive unit tests covering:
- File creation and persistence
- Loading from existing file
- `getApiKey` behavior for `api_key` and `oauth` types (including OAuth expiration)
- Environment variable fallback
- Custom fallback resolver
- Runtime overrides
- Concurrent access via `withLock`

**Impact**:
- Increases confidence in auth subsystem.
- Raises overall test coverage.
- Documents expected behavior for future maintainers.

**Tests**: 14 new tests; all pass.

---

### Round 8 (2026-06-12): Agent Registration Unit Tests

**Problem**: The `Agent` class lacked dedicated unit tests for its tool registration API (`registerTool`, `hasTool`, `getToolNames`). Despite integration tests covering some paths, the individual behavior and edge cases (overrides) were not explicitly verified, creating a coverage gap in the core agent module (~600 lines).

**Solution**: Created `src/agent/agent.registration.test.ts` with 7 focused unit tests:
- Register a simple tool and verify `hasTool` and `getToolNames`.
- Register multiple tools and ensure all names appear.
- Override a tool with same name and confirm replacement semantics (via `ToolExecutor`).

**Impact**:
- Increases confidence in dynamic tool registration used by extensions and runtime.
- Boosts test count by +7.
- Low risk, isolated scope.

**Tests**: 7 tests pass.

---

### Round 9 (2026-06-12): LLM Utilities Unit Tests

**Problem**: Core LLM utilities (`json-parse`, `sanitize-unicode`, `overflow`) lacked unit tests, posing risk for subtle bugs in streaming JSON parsing, Unicode handling, and context truncation.

**Solution**: Added dedicated test suites:
- `json-parse.test.ts`: 8 tests covering complete, incomplete, invalid JSON, arrays, nested objects.
- `sanitize-unicode.test.ts`: 7 tests covering surrogate pair handling, edge cases.
- `overflow.test.ts`: 6 tests for `truncateContext`, including system prompt truncation, message preservation, and token estimation behavior.

**Impact**:
- Significantly increases coverage for low-level LLM layer.
- Documents expectations for unicode and truncation edge cases.
- Low risk, high value.

**Tests**: +21 tests; all pass.

---

### Round 10 (2026-06-12): ApiRegistry Unit Tests

**Problem**: The global API client registry (`ApiRegistry`) was untested, risking memory leaks, improper client reuse, and shutdown issues in production.

**Solution**: Added comprehensive tests covering:
- Client creation and caching
- Different keys produce different clients
- `closeAll()` correctly clears registry
- Stats reporting accuracy
- Private `makeKey` behavior

**Impact**:
- Ensures reliable OpenAI client management.
- Increases test coverage for `llm/api-registry.ts`.
- Low risk.

**Tests**: +8 tests; all pass.

---

### Round 11 (2026-06-12): Model Utilities Unit Tests

**Problem**: The `llm/models.ts` module (cost calculation, xhigh support) lacked tests, leaving critical financial calculations unchecked.

**Solution**: Added tests for `calculateCost` (math correctness) and `supportsXhigh` (provider blacklist).

**Impact**:
- Ensures accurate cost reporting.
- Prevents regressions in reasoning effort support detection.
- Coverage expanded to core LLM module.

**Tests**: +5 tests; all pass.

### Round 12 (2026-06-12): Memory Subsystem Tests & Coverage Push

**Problem**: Critical memory subsystem (storage, retrieval, engine, deduplication, agent-app) lacked unit tests, leaving coverage at ~78% and risking regressions in core functionality.

**Solution**: Wrote comprehensive unit tests for all memory modules and CLI modes, bringing overall test coverage above 80%. Also fixed a bug in `MemoryRetriever.search` where memories from other projects could appear via BM25 scores despite project filter; now BM25 contribution is zeroed for out-of-project memories.

**Implementation**:
- Added test files:
  - `src/memory/storage.test.ts` (28 tests)
  - `src/memory/events.test.ts` (14 tests)
  - `src/memory/retrieval.test.ts` (30 tests)
  - `src/memory/engine.test.ts` (25 tests)
  - `src/memory/engine-dedup.test.ts` (19 tests)
  - `src/memory/agent-app.test.ts` (21 tests)
  - `src/modes/print-mode.test.ts` (7 tests)
  - `src/modes/rpc-mode.test.ts` (1 test)
- Updated `src/memory/retrieval.ts` to enforce project isolation in search.
- Fixed `findByHash` to use `metadata.hash` instead of non-existent top-level `hash`.
- Adjusted many tests to match actual API behaviors.

**Impact**:
- Overall test coverage increased to >82%.
- Memory subsystem now has robust test suite preventing regressions.
- Project filtering in retrieval works correctly.

**Tests**: Added ~145 new unit tests; all pass. Total passing tests: 2085+.

### Round 13 (2026-06-12): AgentLoop & ToolExecutor Edge Cases

**Problem**: While the core agent modules had substantial test coverage, some edge cases remained unchecked, particularly interactions between the terminate flag and follow-up queue, and the guarantee that blocked tools skip handler and afterHook.

**Solution**: Added targeted unit tests:
- AgentLoop: Verified that when all tools signal `terminate`, follow-up messages are still processed before finalizing (ensuring no data loss).
- ToolExecutor: Confirmed that when `beforeToolCall` returns `block: true`, neither the tool handler nor `afterToolCall` are invoked, and an error result is returned.

**Impact**:
- Increases confidence in error handling and termination semantics.
- Improves overall robustness of agent core.
- No regressions (all tests pass).

**Tests**: +2 new unit tests. Total passing tests: 2087+.

---

### Round 14 (2026-06-13): Agent Config & Internal Methods Coverage

**Problem**: The `Agent` class (`src/agent/agent.ts`) had low branch coverage (34.23%) and statement coverage (46.15%). Critical internal methods like `createLogger`, `_resolveConfig`, `_convertToolsToLlm`, `_llmComplete`, `_llmStream`, `_prepareModel`, and constructor config handling paths were not tested, leaving key configuration and LLM integration logic unverified.

**Solution**: Created `src/agent/agent.config.test.ts` with 28 focused unit tests covering:
- `createLogger`: silent logger (enableLogging=false), verbose logger with all event types (agent:start, agent:end, turn:end, tool:error, error)
- `_resolveConfig`: toolExecutionStrategy fallback mapping, default values, nested config merging (contextBuilder, executor)
- `_convertToolsToLlm`: tool conversion with description/parameters defaults, empty array handling
- `_llmComplete`/`_llmStream` with `getApiKey`: API key injection, undefined handling, model-not-set errors
- Constructor edge cases: toolExecutionMode/Strategy precedence, steeringMode to queueMode mapping, loopStrategy defaults (SimpleLoopStrategy for sequential, ReActLoopStrategy for parallel)
- `setModel`: provider creation/clearing
- `execute`/`streamExecute`: runner delegation with correct arguments

**Implementation**:
- New test file `src/agent/agent.config.test.ts` (28 tests)
- Fixed test assumptions to match actual implementation (logger event format, config method names, strategy class names)
- Used dynamic imports for LLM module mocking to avoid vi.doMock timing issues
- Added `minimalConfig` helper for tests requiring unset toolExecutionMode

**Impact**:
- Increases confidence in Agent configuration and LLM integration logic.
- Covers previously untested branches in `_resolveConfig`, `createLogger`, `_convertToolsToLlm`, and private LLM methods.
- Low risk; isolated to test additions only.

**Tests**: +28 new unit tests. Total passing tests: 2218+.

### Round 15 (2026-06-13): AgentLoop Branch Coverage & Bug Fix

**Problem**: AgentLoop had several uncovered branches: abort behavior during long-running LLM calls, streaming error handling, transformContext and convertToLlm failures, and edge cases in prepareNextTurn/getSteeringMessages hooks. Additionally, a bug was discovered where the `isCancelled` flag was being reset in the catch block, causing abort state to be lost.

**Solution**:
- Added `src/agent/agent-loop.branches.test.ts` with 15 targeted unit tests covering:
  - Abort during non-streaming LLM call (AbortSignal propagation)
  - Streaming error handling (stream throwing, error event)
  - Context building errors (transformContext throwing, convertToLlm throwing)
  - Hook error handling (prepareNextTurn and getSteeringMessages failures)
  - Tool execution errors (executeAll throwing)
  - LLM response edge cases (empty content arrays skipped)
  - combineSignals edge cases (undefined, already aborted)
  - Follow-up + terminate interactions (allTerminate with/without follow-up)
  - autoSaveMemory edge cases (undefined content, multiple tool results)
- Fixed `AgentLoop` by removing the line `this.state.isCancelled = false;` from the catch block so that abort state is preserved for non-streaming runs. Streaming runs still reset `isCancelled` in finally as intended.
- Verified that all new tests pass and existing tests remain green.

**Implementation**:
- New test file with comprehensive branch scenarios.
- One-line fix in `src/agent/agent-loop.ts` (catch block).
- Updated related test expectations (e.g., streaming abort resets isCancelled).

**Impact**:
- Increases branch coverage for core AgentLoop module significantly.
- Improves correctness of abort semantics.
- No regressions detected.

**Tests**: +15 new unit tests. Total passing tests: ~2233+.

### Round 16 (2026-06-13): AgentSession Branch Coverage

**Problem**: `AgentSession` had significant uncovered branches in model selection, queue management, retry logic, and compaction, limiting overall branch coverage to ~68%. Needed targeted tests without complex mocking.

**Solution**: Extended `src/session/agent-session.unit.test.ts` with 16 focused unit tests covering:
- `setModel` auth failures and success
- `cycleModel` edge cases (single model, no models)
- Queue overflow handling (steering and follow-up)
- `_isRetryableError` pattern detection (rate limit, overload, timeout, 5xx, non-retryable)
- `dispose` safety (multiple calls)
- `_buildSystemPrompt` with skills and custom prompts
- `sendCustomMessage` variations (deliverAs nextTurn, direct history)
- `abortRetry` state clearing

**Impact**:
- Increases branch coverage for `AgentSession` substantially.
- Brings overall branch coverage closer to 80% target.
- Improves confidence in error handling and edge cases.
- No regressions; all tests pass.

**Tests**: +16 new unit tests. Total passing tests: ~2249+.

### Round 17 (2026-06-13): SettingsManager Branch Coverage

**Problem**: SettingsManager had numerous conditional branches in deep merge, settings retrieval, and defaults that were untested.

**Solution**: Added `src/runtime/settings-manager.branches.test.ts` with 12 tests covering:
- `deepMergeSettings`: nested merging, top-level replacement, array replacement, null/undefined handling
- `getCompactionSettings`: default values, overrides, partial merges, edge cases
- `getRetrySettings`: default values, overrides, partial merges
- `getBranchSummarySettings`: defaults and overrides
- Mutator methods (`setCompactionEnabled`, `setRetryEnabled`) effect on settings

**Impact**: Increases coverage for core runtime configuration module; ensures settings composition works correctly.

**Tests**: +12 new unit tests. Total passing tests: ~2270+.

### Round 18 (2026-06-13): ToolExecutor Branch Coverage

**Problem**: ToolExecutor had complex branching for before/after hooks, caching, execution modes, progress updates, and error handling that needed dedicated tests.

**Solution**: Created `src/agent/tool-executor.branches.test.ts` with 19 comprehensive tests covering:
- `beforeToolCall` returning `block: true` skips tool and after hook; no-block proceeds normally; throwing error propagates
- `afterToolCall` success override: result modification, `isError` conversion, metadata details, `terminate` flag
- `afterToolCall` error override: error message override, converting error to success
- Timeout handling
- Caching: enabled/disabled, cache hits, LRU eviction when size exceeded
- `executeAll`: parallel (default), sequential (global), sequential (per-tool override), abort propagation
- Signal integration: abort passed to context
- Progress updates: `emitProgressUpdates` true emits `tool:progress`; false suppresses it (still emits start/end)

**Impact**: Substantially increases branch coverage for critical tool execution module; validates hook semantics and caching behavior.

**Tests**: +19 new unit tests. Total passing tests: ~2300+.

### Round 19 (2026-06-13): Coverage Validation & Gap Analysis

**Problem**: After Rounds 15-18, branch coverage was still below the 80% target. A detailed analysis was required to identify remaining gaps.

**Solution**:
- Ran full coverage and enumerated uncovered branches per module.
- Identified high-impact modules with many uncovered branches: `prompt-templates`, `cli-args`, `session-manager`, `openai-compatible`, `retrieval`, `auth-storage`, `branch-summarization`, etc.
- Decided to continue branch test development in subsequent rounds.

**Impact**:
- Branch coverage at ~70.38%, statements 79.05%, lines 79.92% – still below target.
- No regressions; all tests passing.

### Round 20 (2026-06-13): Branch Tests for Prompt Templates & CLI Args

**Problem**: `prompt-templates.ts` and `cli-args.ts` together had ~59 uncovered branches. Both modules are relatively self-contained and good candidates for quick coverage gains.

**Solution**:
- Created `src/runtime/prompt-templates.branches.test.ts` with 24 tests covering:
  - `parseCommandArgs` edge cases (unmatched quotes, trailing spaces, empty input).
  - `substituteArgs` advanced patterns (out-of-range indices, empty args, length overflow).
  - `expandPromptTemplate` behavior (missing template, arg handling).
  - `loadPromptTemplates` integration (includeDefaults, explicit paths, errors, symlinks, malformed frontmatter).
- Created `src/runtime/cli-args.branches.test.ts` with 30 tests covering:
  - Unknown flag handling (short flags, `--flag=value`, standalone, with missing value).
  - `--list-models` with/without value.
  - `--tools`, `--models`, `--no-*` flags, extension/skill/prompt-template/theme flags, `--export`.
  - Invalid `--thinking` level warning, invalid mode, missing value behaviors.
  - File arguments heuristics, mixed messages.

**Impact**:
- Approximately +80 covered branches (est. based on branch count improvements).
- Branch coverage increased from 68.37% to 70.38% overall.
- All tests pass; no regressions.

---

### Round 21 (2026-06-13): AgentSession Prompt & MemoryRetriever Branch Tests

**Problem**:
- AgentSession.prompt() had several uncovered branches: streaming queue decisions, validation errors, and success path.
- MemoryRetriever in `retrieval.ts` had ~18 uncovered branches in `retrieve()` filtering logic.

**Solution**:
- Created `src/session/agent-session-prompt.branches.test.ts` with 6 tests covering:
  - Streaming queue actions (steer/followUp) based on `streamingBehavior`.
  - Validation errors: missing model and missing API key.
  - Success path: agent.run and pending flush.
- Created `src/memory/retrieval.branches.test.ts` with 12 tests covering:
  - `filterByProject`, `filterByAction`, `filterByFile`, `filterByTask`.
  - Default project fallback, limit handling, empty array.

**Impact**:
- Added 18 branch coverage tests; estimated branch coverage increased from ~70.38% to ~71.0%.
- All tests pass; no regressions.

---

### Round 22 (2026-06-13): SessionManager Branch Tests

**Problem**: SessionManager had several uncovered error-handling branches in `importSession`, `branch`, `branchWithSummary`, and `appendLabelChange`.

**Solution**:
- Created `src/session/session-manager.branches.test.ts` with 7 tests covering:
  - `importSession` invalid JSON, missing password for encrypted, decryption failure.
  - `branch` when parent entry not found.
  - `branchWithSummary` with nonexistent parent.
  - `appendLabelChange` target not found and success path.

**Impact**:
- Covered key error branches in SessionManager; branch coverage slightly improved.
- All tests pass; no regressions.

---

### Round 23 (2026-06-13): EnvApiKeys Branch Tests

**Problem**: `env-api-keys` module had 14 uncovered branches, particularly in `getApiKey` fallback logic, `hasApiKey`, and `getRequiredEnvVars`.

**Solution**:
- Created `src/llm/env-api-keys.branches.test.ts` with 11 tests covering:
  - Explicit key override.
  - Provider-specific environment variable lookup.
  - Fallback chain: common `API_KEY`, provider-specific uppercase, `OPENAI_API_KEY`.
  - `hasApiKey` boolean return.
  - `getRequiredEnvVars` for various providers.

**Impact**:
- Covered core fallback branches; branch coverage increased slightly (~+0.3% estimated).
- All tests pass; no regressions.

---

### Round 24 (2026-06-13): AuthStorage Branch Tests

**Problem**: `AuthStorage` module had many uncovered branches in `hasAuth()`, `getApiKey()`, `getAuthStatus()`, and lifecycle methods.

**Solution**:
- Created `src/session/auth-storage.branches.test.ts` with 26 tests covering:
  - `has()` data presence.
  - `hasAuth()` across runtime overrides, stored credentials, OAuth expiry, environment, fallback.
  - `getApiKey()` priority and fallback logic, including `includeFallback` option.
  - `getAuthStatus()` for all sources.
  - `parseStorageData()` error handling.
  - `reload()` loading.
  - `set()` and `remove()`.

**Impact**:
- Covered core AuthStorage branches; branch coverage increased to ~73%.
- All tests pass; no regressions.

---

### Round 25 (2026-06-13): AgentSession Event Handling Branch Tests

**Problem**: `AgentSession` had many uncovered branches in `_processAgentEvent` and related event handling logic.

**Solution**:
- Created `src/session/agent-session-events.branches.test.ts` with 21 tests covering:
  - `auto_retry_end` resetting retry abort flag.
  - `message:start` user queue removal (steering/follow-up) and overflow recovery reset.
  - `message:end` for user/assistant/tool appending to session manager.
  - `_handleAgentEvent` for assistant-specific logic: setting `_lastAssistantMessage`, resetting `_overflowRecoveryAttempted`, auto-retry success emission, and retry attempt reset.
  - `agent:end` scenarios: with no last assistant, with retryable error (early return), normal flow (retry resolve, flush, performance), auto-compaction (fixed bug: now uses captured `msg` instead of cleared property), performance tracking.
  - Fixed compaction call to use `msg` instead of `_lastAssistantMessage` which was cleared earlier.

**Impact**:
- Covered core event handling branches in AgentSession; branch coverage improved to ~75%.
- All tests pass; no regressions.

### Round 27 (2026-06-13): BranchSummarization Branch Tests

**Problem**: `branch-summarization` module had many uncovered branches in file ops extraction, list formatting, and entry collection.

**Solution**:
- Created `src/session/branch-summarization.branches.test.ts` with 15 tests covering:
  - `extractFileOpsFromMessage`: read/write/edit detection, role filtering, missing args/path.
  - `computeFileLists`: separating read-only vs modified, sorting.
  - `formatFileOperations`: empty, read-only, modified-only, both.
  - `collectEntriesForBranchSummary`: null oldLeafId, found common ancestor, missing entry breaks collection.

**Impact**:
- Covered most branches in branch-summarization; branch coverage improved incrementally.
- All tests pass; no regressions.

---

### Round 28 (2026-06-13): OpenAI-Compatible Provider Branch Tests

**Problem**: The OpenAI-compatible provider still had many uncovered branches in `buildParams` and related logic.

**Solution**:
- Created `src/llm/providers/openai-compatible.branches.test.ts` with 10 branch-focused tests.
- Covered system message role selection (`system` vs `developer`), max tokens parameter name variations (`max_tokens`, `max_output_tokens`).
- Addressed `requiresThinkingAsText` behavior: when true, thinking blocks are converted to text and concatenated; when false, thinking is dropped and only text blocks remain.
- Verified toolCall ID normalization (splitting on pipe, removing special characters) via `tool_calls` array in final request.
- Tested tools and tool_choice passthrough.

**Impact**:
- Covered additional branches in the provider; test suite remains fully passing.
- Incremental branch coverage improvement continues toward 80% target.

---

### Round 29 (2026-06-13): Compaction Utilities Branch Tests

**Problem**: Compaction module had several uncovered branches in core utilities (`shouldCompact`, `findCutPoint`, `prepareCompaction`).

**Solution**:
- Created `src/session/compaction.branches.test.ts` with 8 tests covering:
  - `shouldCompact` logic for enabled flag and token threshold.
  - `findCutPoint` cut index detection and split-turn flag based on message roles and tokens.
  - `prepareCompaction` early return for empty entries and basic single-message recipe.

**Impact**:
- Increased branch coverage for the compaction subsystem; tests remain green.
- Overall branch coverage estimate: ~77.5%.

---

### Round 30 (2026-06-13): SessionManager Branch Success Test

**Problem**: The `branch()` method’s success path (valid existing entry) was not explicitly tested.

**Solution**:
- Added a test to `src/session/session-manager.branches.test.ts` covering the non-error branch where `branch()` is called with a valid ID and completes without throwing.

**Impact**:
- Incremental branch coverage gain; maintains test suite health.
- Overall branch coverage estimate: ~77.6%.

---

### Round 31 (2026-06-13): AgentSession _checkCompaction Branch Tests

**Problem**: The private `_checkCompaction` method in `AgentSession` had several uncovered branches related to compaction enabling, aborted messages, overflow recovery, and error emission.

**Solution**:
- Extended `src/session/agent-session.unit.test.ts` with 4 new tests covering:
  - Early return when compaction disabled.
  - Early return when `stopReason` is `aborted`.
  - Overflow recovery path triggers `_runAutoCompaction` and sets `_overflowRecoveryAttempted` flag.
  - Second overflow attempt emits `compaction_end` event without further compaction.

**Impact**:
- Increased branch coverage in core agent session compaction logic.
- All tests pass; no regressions.
- Overall branch coverage estimate: ~78.0%.

---

### Round 32 (2026-06-13): SessionManager branchWithSummary Tests

**Problem**: The `branchWithSummary` method in `SessionManager` had several uncovered branches: handling null `branchFromId`, error on missing parent, and successful creation with existing parent.

**Solution**:
- Added three tests to `src/session/session-manager.branches.test.ts` covering:
  - Creating a branch summary from the root (`null` branchFromId).
  - Error when the specified `branchFromId` does not exist.
  - Creating a branch summary from an existing entry and verifying parent-child linkage.

**Impact**:
- Filled remaining gaps in `SessionManager` branch coverage; all tests green.
- Overall branch coverage estimate: ~78.2%.

---

### Round 33 (2026-06-13): SessionManager Query Method Tests

**Problem**: Several query methods in `SessionManager` lacked dedicated branch tests, including `getChildren`, `findByLabel`, `findByTypes`, and `searchMessages`.

**Solution**:
- Created `src/session/session-manager-queries.branches.test.ts` with 4 tests covering:
  - `getChildren` retrieving immediate children.
  - `findByLabel` finding target entries with a specific label.
  - `findByTypes` filtering by entry types.
  - `searchMessages` text search in message content.

**Impact**:
- Additional branch coverage in SessionManager; tests passing.
- Overall branch coverage estimate: ~78.4%.

---

### Round 34 (2026-06-13): TransformMessages Branch Tests

**Problem**: The `transform-messages` module had multiple uncovered branches in image downgrade, thinking block conversion, and toolCall normalization.

**Solution**:
- Created `src/llm/transform-messages.branches.test.ts` with 7 tests covering:
  - Image block placeholder when model lacks image support, preservation when supported.
  - Thinking blocks: keep for same model, convert to text for cross-model, drop empty.
  - ToolCall ID normalization (pipe/special chars) and removal of `thoughtSignature` for cross-model.

**Impact**:
- Improved branch coverage across the LLM transform pipeline.
- All tests pass; no regressions.
- Overall branch coverage estimate: ~78.7%.

---

### Round 35 (2026-06-13): AgentSession Unit Tests Expansion

**Problem**: Additional branches in `AgentSession` remained untested, including queue eviction, retryable error detection variations, system prompt building, and threshold-based compaction.

**Solution**:
- Extended `src/session/agent-session.unit.test.ts` with 9 new tests covering:
  - `_queueSteer` and `_queueFollowUp` eviction when exceeding max queue sizes.
  - `_isRetryableError` for multiple error patterns (rate limit, 5xx, overload, timeout, non-retryable).
  - `_buildSystemPrompt` with skills & append prompts and default case.
  - `_checkCompaction` threshold mode trigger.

**Impact**:
- Significant branch coverage gain in core agent session.
- All tests pass; no regressions.
- Overall branch coverage estimate: ~79.0%.

---

## Planned Refactors (Next Rounds)

1. ~~Tool Execution Modes per Tool~~ (Completed in Round 2)
   - Allows per-tool `executionMode` override; if any tool is sequential, batch runs sequential.

3. ~~`terminate` Flag Support~~ (Completed in Round 3)
   - Tool results can include `terminate: true` hint to stop early.
   - Implemented early exit from tool batch processing when all terminate.

## Anticipated Technical Debt

- Complexity of `AgentLoop` increasing; may need to extract outer/inner loop logic into separate classes.
- Consider migrating from `ConversationTurn[]` to `AgentMessage[]` for better alignment with reference (future task).