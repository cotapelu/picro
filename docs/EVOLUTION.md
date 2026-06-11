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
- Added helper methods `collectFollowUpTurns` and `turnsToText`.

**Impact**:
- Enables continuous operation without external resume.
- Maintains backward compatibility (existing queues still work).
- Slightly more complex loop structure but still maintainable.

**Tests**: All existing tests pass; new tests added (TODO) to verify follow-up flow.

## Planned Refactors (Next Rounds)

1. **Tool Execution Modes per Tool** (Medium priority)
   - Reference supports `tool.executionMode` override.
   - Will allow sequential tools to run in isolation within parallel batch.

2. **`prepareNextTurn` Hook** (Medium)
   - Allows dynamic model/reasoning level changes mid-run.
   - Useful for escalating to stronger model after initial pass.

3. **`terminate` Flag Support** (Low-Medium)
   - Tool results can include `terminate: true` hint to stop early.
   - Implement early exit from tool batch processing when all terminate.

4. **`getSteeringMessages` Hook** (Low)
   - Instead of direct queue access, use hook to supply steering messages dynamically.

## Anticipated Technical Debt

- Complexity of `AgentLoop` increasing; may need to extract outer/inner loop logic into separate classes.
- Consider migrating from `ConversationTurn[]` to `AgentMessage[]` for better alignment with reference (future task).
