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

## Planned Refactors (Next Rounds)

1. ~~Tool Execution Modes per Tool~~ (Completed in Round 2)
   - Allows per-tool `executionMode` override; if any tool is sequential, batch runs sequential.

2. **`getSteeringMessages` Hook** (Low)
   - Instead of direct queue access, use hook to supply steering messages dynamically.

3. ~~`terminate` Flag Support~~ (Completed in Round 3)
   - Tool results can include `terminate: true` hint to stop early.
   - Implemented early exit from tool batch processing when all terminate.

## Anticipated Technical Debt

- Complexity of `AgentLoop` increasing; may need to extract outer/inner loop logic into separate classes.
- Consider migrating from `ConversationTurn[]` to `AgentMessage[]` for better alignment with reference (future task).
