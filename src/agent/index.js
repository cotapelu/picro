// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/agent - Core Agent Library (pure logic, no session persistence)
 *
 * This is the lowest-level agent module. It contains only the core
 * agent execution logic without any session persistence, UI, or runtime concerns.
 *
 * Dependencies: None (only uses internal files and ../events, ../llm)
 */
// Agent
export { Agent } from './agent.js';
// Tool Execution
export { ToolExecutor } from './tool-executor.js';
// Event System (Agent emits events)
export { EventEmitter, createConsoleLogger } from '../events/event-emitter.js';
export { createEventBus } from '../events/event-bus.js';
export { PrioritizedEventEmitter } from '../events/prioritized-event-emitter.js';
export { EventRecorder } from '../events/event-recorder.js';
export * from '../events/event-guards.js';
// Utilities (agent-specific)
export { isContextOverflow } from './pi-ai-shim.js';
export { ExtensionRunner, createExtensionRuntime } from '../extensions/runner.js';
// Components
export { ContextBuilder } from './context-manager.js';
export { MessageQueue } from './message-queue.js';
// Loop Strategies
export { LoopStrategyFactory, ReActLoopStrategy, PlanSolveLoopStrategy, ReflectionLoopStrategy, SimpleLoopStrategy, SelfRefineLoopStrategy, } from './loop-strategy.js';
// Proxy Streaming
export { createProxyStream } from './proxy-stream.js';
//# sourceMappingURL=index.js.map