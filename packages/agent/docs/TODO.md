# TODO: Agent Package Implementation

This file outlines the work needed to bring the `@picro/agent` package to full feature parity with the legacy `pi-agent-legacy` core while implementing new features and improvements.

## 🎯 Mission

Build a professional, extensible agent framework that serves as the core logic for the pi-micro AI coding assistant.

## 📋 Legacy Core Features to Reimplement (Without Copying)

Based on analysis of `pi-agent-legacy/core/` directory, the following features need to be reimplemented in the new `src/` architecture:

### 1. Agent Class & State Management
- [ ] Reimplement `Agent` class with mutable state pattern (getters/setters for tools/messages)
- [ ] Implement `MutableAgentState` equivalent for internal state management
- [ ] Add `waitForIdle()` method to await completion of current run and listeners
- [ ] Enhance `reset()` to clear transcript, runtime state, and queues
- [ ] Add `sessionId` property for cache-aware backends
- [ ] Implement `thinkingBudgets` and `transport` configuration

### 2. Event System Enhancement
- [ ] Align event types with legacy: `agent_start`, `agent_end`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`
- [ ] Ensure proper event payloads match legacy specifications (e.g., `tool_execution_end` includes `result` and `isError`)
- [ ] Implement proper event ordering and settlement semantics
- [ ] Add `agent_end` listeners settlement before considering agent idle

### 3. Loop Configuration & Context Handling
- [ ] Implement `AgentLoopConfig` equivalent with:
  - `convertToLlm`: Message[] conversion function
  - `transformContext`: Optional context transformation
  - `getApiKey`: Dynamic API key resolution
  - `getSteeringMessages`/`getFollowUpMessages`: Queue injection points
  - `toolExecution`: Sequential/parallel execution mode
  - `beforeToolCall`/`afterToolCall`: Hook interfaces with proper context
- [ ] Enhance context building to support AgentMessage-level operations
- [ ] Implement proper LLM message conversion pipeline

### 4. Tool Execution Improvements
- [ ] Implement `ToolExecutionMode` (sequential vs parallel) with proper ordering
- [ ] Add tool call preparation phase with argument preparation and validation
- [ ] Implement `prepareArguments` compatibility shim in tool definitions
- [ ] Enhance `beforeToolCall`/`afterToolCall` hooks with rich context objects
- [ ] Add tool execution update streaming (partial results)
- [ ] Implement error tool result creation and handling

### 5. Message & Custom Types System
- [ ] Implement `AgentMessage` union type for extensibility
- [ ] Create `CustomAgentMessages` interface for declaration merging
- [ ] Define standard message types: `TextContent`, `ImageContent`, `ToolCall`, `ToolResult`
- [ ] Implement proper message normalization and conversion utilities

### 6. Streaming Functionality
- [ ] Implement proper `StreamFn` type and contract
- [ ] Enhance `Agent.stream()` to yield real-time delta events
- [ ] Add message start/update/end events during streaming
- [ ] Implement proper error handling in streams (encode in final message)
- [ ] Add support for thinking tokens and tool call streaming

### 7. Queue Systems
- [ ] Enhance `MessageQueue` to match legacy `PendingMessageQueue` behavior
- [ ] Ensure proper `drain()` behavior for different modes ("all" vs "one-at-a-time")
- [ ] Add queue clearing and inspection methods
- [ ] Implement proper steering/follow-up message processing in loop

### 8. LLM Integration Points
- [ ] Add `getApiKey` dynamic resolution for expiring tokens
- [ ] Implement `onPayload` callback for stream processing
- [ ] Add `maxRetryDelayMs` configuration for provider retries
- [ ] Implement proper transport abstraction (SSE, WebSocket, etc.)

### 9. Error Handling & Recovery
- [ ] Implement proper error message propagation in agent runs
- [ ] Add `errorMessage` state tracking
- [ ] Implement abort handling with proper cleanup
- [ ] Enhance failure scenarios with appropriate stop reasons

### 10. Extensibility Points
- [ ] Implement agent loop extension points (similar to legacy extensions)
- [ ] Add tool definition wrapper pattern for compatibility shims
- [ ] Create extension loader/runner infrastructure
- [ ] Implement skill system integration points

## 🚀 Tier 1 Priorities (from AGENTS.md) - Agent Package Relevance

### 1. Memory UI Integration
- [ ] Ensure memory injection works properly in context building
- [ ] Add memory retrieval events with detailed payloads
- [ ] Implement memory saving hooks (autoSaveMemories)
- [ ] Add memory metadata to tool results for UI highlighting

### 2. Debug Mode Panel
- [ ] Implement detailed timing metrics in agent execution
- [ ] Add tool execution timing collection
- [ ] Add LLM latency and token counting
- [ ] Create debug event emission for UI overlay
- [ ] Implement JSONL debug logging to file

### 3. Enhanced Session Search (Indirect)
- [ ] Ensure proper message and tool result storage in history
- [ ] Add metadata tagging for searchability
- [ ] Implement proper timestamping for all events
- [ ] Ensure tool results are stored with sufficient context

### 4. Tool Progress & Cancellation
- [ ] Enhance tool executor to accept progress callbacks
- [ ] Implement real-time progress updates during tool execution
- [ ] Add proper abort signal propagation to tools
- [ ] Create UI-compatible progress event structure

## 🔧 Architecture & Cleanup

### 1. Code Quality
- [ ] Add JSDoc comments for all public APIs
- [ ] Ensure consistent error handling patterns
- [ ] Remove any dead code or unused imports
- [ ] Implement proper TypeScript strictness

### 2. Testing
- [ ] Add unit tests for all new/changed functionality
- [ ] Aim for >80% coverage on modified files
- [ ] Test edge cases: empty queues, simultaneous signals, etc.
- [ ] Test memory integration and tool hook functionality

### 3. Documentation
- [ ] Update inline JSDoc for all public exports
- [ ] Create usage examples in README
- [ ] Document breaking changes from legacy
- [ ] Add migration guide for legacy users

## 📈 Success Metrics

- [ ] All legacy core functionality can be implemented using new agent API
- [ ] Public API maintains backward compatibility where possible
- [ ] Build passes: `npm run build --workspaces` succeeds
- [ ] Test suite passes with adequate coverage
- [ ] Manual testing shows proper event ordering and tool execution
- [ ] Memory integration works correctly with UI components

## 🔄 Implementation Approach

Given the clean-room reimplementation constraint, we will:

1. **Study legacy behavior** - Understand what each feature does
2. **Design equivalent APIs** - Create new implementations that achieve same goals
3. **Incremental implementation** - Start with core loop, then events, then tools, etc.
4. **Continuous verification** - Test against legacy behavior patterns
5. **Focus on user-facing contracts** - Ensure same inputs produce similar outputs

## 📝 Notes

- We are NOT copying code from legacy - we are reimplementing concepts
- The new architecture may be different but must support same use cases
- Priority is on correctness, then performance, then features
- When in doubt, refer to AGENTS.md philosophy: "Professional, not playful"