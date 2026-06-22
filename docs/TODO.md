# InteractiveMode Compatibility TODO

## Background
Picro cần tương thích với `InteractiveMode` từ `pi-coding-agent`. Reference implementation dùng **turn-based event model** (`turn:start`/`turn:end`) và **draining pending messages** (steering/follow-up) sau mỗi turn.

## Current State
- TUI loads nhưng input không hiển thị response.
- AgentLoop hiện đang dùng `message:start`/`message:end` và chưa drain queue.
- `AgentSession.isStreaming` chưa phản ánh đúng trạng thái.
- Thiếu field `turn` trong forwarded events → InteractiveMode crash.

## Required Fixes (in order)

### 1. AgentRuntimeState (types)
- [x] Add `isRunning: boolean` (already exists)
- [ ] Remove `isStreaming` if added (optional, but cleaner)

### 2. AgentLoop (`src/agent/agent-loop.ts`)
#### Essential changes:
- [ ] `run()` and `stream()` must set `this.state.isRunning = true` at start and `false` at end (try/finally).
- [ ] Replace `message:start` / `message:end` events with `turn:start` / `turn:end`.
  - Streaming branch: emit `turn:start` when assistant message begins, `turn:end` when it ends.
  - Non-stream branch: emit `turn:start` and `turn:end` appropriately.
- [ ] Ensure `turn:end` event payload includes `turn` (assistant message) and `toolResults`.
- [ ] **Drain pending messages** after each turn (before checking `shouldStopAfterTurn`):
  ```ts
  const steering = this.config.getSteeringMessages?.() || [];
  const followUp = this.config.getFollowUpMessages?.() || [];
  if (steering.length || followUp.length) {
    // Append as user turns to this.state.history
    for (const msg of steering) { /* push user turn */ }
    for (const msg of followUp) { /* push user turn */ }
    continue; // Next iteration will call LLM again
  }
  ```
- [ ] Call `shouldStopAfterTurn` only after draining check? Actually reference: after `turn_end`, check `shouldStopAfterTurn`; if false, drain and continue.

### 3. AgentSession (`src/session/agent-session.ts`)
#### a. Queue wiring
- [ ] In constructor, set:
  ```ts
  (this.agent.getConfig() as any).getSteeringMessages = () => this._steeringMessages;
  (this.agent.getConfig() as any).getFollowUpMessages = () => this._followUpMessages;
  ```

#### b. `isStreaming` getter
- [ ] Simplify: `return this.agent.getState().isRunning;` (remove `_isPromptRunning` flag or keep separately if needed for other purposes).
- [ ] Ensure `_isPromptRunning` is removed or not used for `isStreaming`.

#### c. Event forwarding
- [ ] In `_handleAgentEvent`, forward `turn:start` and `turn:end` to session listeners:
  ```ts
  if (event.type === 'turn:start' || event.type === 'turn:end') {
    this._emit({
      type: event.type.replace(':', '_'),
      timestamp: event.timestamp,
      round: event.round,
      turn: event.turn,
      message: event.turn, // alias for compatibility
    } as any);
  }
  ```

### 4. Agent (`src/agent/agent.ts`)
- [ ] Add `getConfig(): any` to expose config (already added if not).
- [ ] Ensure `config` has optional `getSteeringMessages` and `getFollowUpMessages`.

### 5. Test & Verify
- [ ] Build: `npm run build` clean.
- [ ] Run TUI with `--mode interactive --provider nvidia --model meta/llama-3.1-70b-instruct --api-key ...`.
- [ ] Type "hi" and verify:
  - Response appears in TUI.
  - No crashes (`event.turn` defined).
  - Multiple "hi" messages are queued and processed sequentially.
- [ ] If still issues, add debug logs to trace:
  - `AgentLoop.executeLoop`: when assistant turn created, when draining queue.
  - `AgentSession._handleAgentEvent`: event shapes.

## Notes from Reference
- `agentLoop` uses `AgentMessage[]` but picro uses `ConversationTurn[]`. Conversion is handled in `ContextBuilder`.
- `shouldStopAfterTurn` hook: reference checks after `turn_end`. Picro should do same.
- `turn_start` emitted before LLM response stream begins (or immediately for non-stream).
- `turn_end` emitted immediately after assistant message is finalized (before tool calls? Actually reference emits `turn_end` after assistant message, then executes tools; tool results are added as new turns). Check reference: `turn_end` occurs after assistant message, then tool results are appended as separate turns.
  - In picro, we can emit `turn_end` after assistant turn is created, then proceed to tool calls if any.

## Implementation Plan (Step-by-Step)
1. Fix AgentLoop event types and draining logic (core).
2. Fix AgentSession forwarding and `isStreaming`.
3. Wire queue access in constructor.
4. Clean up debug logs.
5. Test.

---

**Note (2026-06-22)**: Round 86 fixed the multi-turn conversation issue by ensuring AgentLoop always checks follow-up queue after each turn, removing erroneous hooks, and syncing session state. All 2974 tests pass. Remaining items in this TODO are either already satisfied by current architecture (e.g., `turn:start`/`turn:end` replaced by `message:start`/`message:end` in our event model) or optional.

Last updated: 2025-06-17
