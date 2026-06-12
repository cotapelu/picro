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

## Planned Refactors (Next Rounds)

1. ~~Tool Execution Modes per Tool~~ (Completed in Round 2)
   - Allows per-tool `executionMode` override; if any tool is sequential, batch runs sequential.

3. ~~`terminate` Flag Support~~ (Completed in Round 3)
   - Tool results can include `terminate: true` hint to stop early.
   - Implemented early exit from tool batch processing when all terminate.

## Anticipated Technical Debt

- Complexity of `AgentLoop` increasing; may need to extract outer/inner loop logic into separate classes.
- Consider migrating from `ConversationTurn[]` to `AgentMessage[]` for better alignment with reference (future task).
