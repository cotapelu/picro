// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/runtime - Application Layer
 */

// Composition Root
export { createAgentSessionRuntime } from './agent-session-runtime';
export type {
  AgentSessionRuntimeDiagnostic,
  CreateAgentSessionRuntimeResult,
  AgentSessionRuntime,
} from './agent-session-runtime';

// Re-export core & session for convenience
export { Agent, AgentConfig, AgentRunResult } from '../agent';
export { ToolExecutor } from '../agent/tool-executor';
export { buildSystemPrompt } from '../agent/system-prompt';
export { AgentSession } from '../session/agent-session';
export type { AgentSessionConfig, AgentSessionEventListener, AgentSessionEvent } from '../session/agent-session-types';
export { SettingsManager } from './settings-manager';
export { DefaultResourceLoader, loadProjectContextFiles } from './resource-loader';
export { PerformanceTracker } from './performance-tracker';
