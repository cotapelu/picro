"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/agent - Core Agent Library (pure logic, no session persistence)
 *
 * This is the lowest-level agent module. It contains only the core
 * agent execution logic without any session persistence, UI, or runtime concerns.
 *
 * Dependencies: None (only uses internal files and ../events, ../llm)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProxyStream = exports.SelfRefineLoopStrategy = exports.SimpleLoopStrategy = exports.ReflectionLoopStrategy = exports.PlanSolveLoopStrategy = exports.ReActLoopStrategy = exports.LoopStrategyFactory = exports.MessageQueue = exports.ContextBuilder = exports.createExtensionRuntime = exports.ExtensionRunner = exports.isContextOverflow = exports.EventRecorder = exports.PrioritizedEventEmitter = exports.createEventBus = exports.createConsoleLogger = exports.EventEmitter = exports.ToolExecutor = exports.Agent = void 0;
// Agent
var agent_js_1 = require("./agent.js");
Object.defineProperty(exports, "Agent", { enumerable: true, get: function () { return agent_js_1.Agent; } });
// Tool Execution
var tool_executor_js_1 = require("./tool-executor.js");
Object.defineProperty(exports, "ToolExecutor", { enumerable: true, get: function () { return tool_executor_js_1.ToolExecutor; } });
// Event System (Agent emits events)
var event_emitter_js_1 = require("../events/event-emitter.js");
Object.defineProperty(exports, "EventEmitter", { enumerable: true, get: function () { return event_emitter_js_1.EventEmitter; } });
Object.defineProperty(exports, "createConsoleLogger", { enumerable: true, get: function () { return event_emitter_js_1.createConsoleLogger; } });
var event_bus_js_1 = require("../events/event-bus.js");
Object.defineProperty(exports, "createEventBus", { enumerable: true, get: function () { return event_bus_js_1.createEventBus; } });
var prioritized_event_emitter_js_1 = require("../events/prioritized-event-emitter.js");
Object.defineProperty(exports, "PrioritizedEventEmitter", { enumerable: true, get: function () { return prioritized_event_emitter_js_1.PrioritizedEventEmitter; } });
var event_recorder_js_1 = require("../events/event-recorder.js");
Object.defineProperty(exports, "EventRecorder", { enumerable: true, get: function () { return event_recorder_js_1.EventRecorder; } });
__exportStar(require("../events/event-guards.js"), exports);
// Utilities (agent-specific)
var pi_ai_shim_js_1 = require("./pi-ai-shim.js");
Object.defineProperty(exports, "isContextOverflow", { enumerable: true, get: function () { return pi_ai_shim_js_1.isContextOverflow; } });
var runner_js_1 = require("../extensions/runner.js");
Object.defineProperty(exports, "ExtensionRunner", { enumerable: true, get: function () { return runner_js_1.ExtensionRunner; } });
Object.defineProperty(exports, "createExtensionRuntime", { enumerable: true, get: function () { return runner_js_1.createExtensionRuntime; } });
// Components
var context_manager_js_1 = require("./context-manager.js");
Object.defineProperty(exports, "ContextBuilder", { enumerable: true, get: function () { return context_manager_js_1.ContextBuilder; } });
var message_queue_js_1 = require("./message-queue.js");
Object.defineProperty(exports, "MessageQueue", { enumerable: true, get: function () { return message_queue_js_1.MessageQueue; } });
// Loop Strategies
var loop_strategy_js_1 = require("./loop-strategy.js");
Object.defineProperty(exports, "LoopStrategyFactory", { enumerable: true, get: function () { return loop_strategy_js_1.LoopStrategyFactory; } });
Object.defineProperty(exports, "ReActLoopStrategy", { enumerable: true, get: function () { return loop_strategy_js_1.ReActLoopStrategy; } });
Object.defineProperty(exports, "PlanSolveLoopStrategy", { enumerable: true, get: function () { return loop_strategy_js_1.PlanSolveLoopStrategy; } });
Object.defineProperty(exports, "ReflectionLoopStrategy", { enumerable: true, get: function () { return loop_strategy_js_1.ReflectionLoopStrategy; } });
Object.defineProperty(exports, "SimpleLoopStrategy", { enumerable: true, get: function () { return loop_strategy_js_1.SimpleLoopStrategy; } });
Object.defineProperty(exports, "SelfRefineLoopStrategy", { enumerable: true, get: function () { return loop_strategy_js_1.SelfRefineLoopStrategy; } });
// Proxy Streaming
var proxy_stream_js_1 = require("./proxy-stream.js");
Object.defineProperty(exports, "createProxyStream", { enumerable: true, get: function () { return proxy_stream_js_1.createProxyStream; } });
//# sourceMappingURL=index.js.map