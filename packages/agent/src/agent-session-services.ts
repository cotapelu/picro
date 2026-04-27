// SPDX-License-Identifier: Apache-2.0
/**
 * AgentSessionServices - Cwd-bound runtime services
 *
 * This is a stub implementation - full implementation coming in Phase A3
 */

import type { AuthStorage } from "./auth-storage.js";
import type { SettingsManager } from "./settings-manager.js";
import type { ModelRegistry } from "./model-registry.js";
import type { ResourceLoader } from "./resource-loader.js";
import type { SessionManager } from "./session-manager.js";
import type { ToolDefinition } from "./types.js";

/**
 * Session start event metadata
 */
export interface SessionStartEvent {
  type: "session_start";
  reason: "startup" | "new" | "resume" | "fork";
  previousSessionFile?: string;
}
import type { Model } from "@picro/llm";
import type { ThinkingLevel } from "./agent-types.js";

/**
 * Non-fatal issues collected while creating services or sessions
 */
export interface AgentSessionRuntimeDiagnostic {
  type: "info" | "warning" | "error";
  message: string;
}

/**
 * Inputs for creating cwd-bound runtime services
 */
export interface CreateAgentSessionServicesOptions {
  cwd: string;
  agentDir?: string;
  authStorage?: AuthStorage;
  settingsManager?: SettingsManager;
  modelRegistry?: ModelRegistry;
  extensionFlagValues?: Map<string, boolean | string>;
  resourceLoaderOptions?: any;
}

/**
 * Inputs for creating an AgentSession from already-created services
 */
export interface CreateAgentSessionFromServicesOptions {
  services: AgentSessionServices;
  sessionManager: SessionManager;
  sessionStartEvent?: SessionStartEvent;
  model?: Model;
  thinkingLevel?: ThinkingLevel;
  scopedModels?: Array<{ model: Model; thinkingLevel?: ThinkingLevel }>;
  tools?: string[];
  noTools?: "all" | "builtin";
  customTools?: ToolDefinition[];
}

/**
 * Coherent cwd-bound runtime services for one effective session cwd
 */
export interface AgentSessionServices {
  cwd: string;
  agentDir: string;
  authStorage: AuthStorage;
  settingsManager: SettingsManager;
  modelRegistry: ModelRegistry;
  resourceLoader: ResourceLoader;
  diagnostics: AgentSessionRuntimeDiagnostic[];
}

/**
 * Create cwd-bound runtime services
 */
export async function createAgentSessionServices(
  options: CreateAgentSessionServicesOptions
): Promise<AgentSessionServices> {
  throw new Error("Not implemented");
}

/**
 * Create an AgentSession from previously created services
 */
export async function createAgentSessionFromServices(
  options: CreateAgentSessionFromServicesOptions
): Promise<any> {
  throw new Error("Not implemented");
}