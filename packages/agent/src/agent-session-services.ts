// SPDX-License-Identifier: Apache-2.0
/**
 * AgentSessionServices - Cwd-bound runtime services
 *
 * Provides all cwd-bound services needed by AgentSession
 */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

import { AuthStorage } from "./auth-storage.js";
import { SettingsManager } from "./settings-manager.js";
import { DefaultModelRegistry } from "./model-registry.js";
import { DefaultResourceLoader } from "./resource-loader.js";
import { SessionManager } from "./session-manager.js";
import { Agent } from "./agent.js";
import { AgentSession } from "./agent-session.js";
import { DEFAULT_TOOL_TIMEOUT } from "./defaults.js";
import type { ToolDefinition } from "./types.js";

import {
  createBashToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
  createEditToolDefinition,
  createLsToolDefinition,
} from "./tools/index.js";

import type { Model } from "@picro/llm";

/**
 * Session start event metadata
 */
export interface SessionStartEvent {
  type: "session_start";
  reason: "startup" | "new" | "resume" | "fork";
  previousSessionFile?: string;
}

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
  modelRegistry?: DefaultModelRegistry;
  extensionFlagValues?: Map<string, boolean | string>;
  resourceLoader?: DefaultResourceLoader;
}

/**
 * Inputs for creating an AgentSession from already-created services
 */
export interface CreateAgentSessionFromServicesOptions {
  services: AgentSessionServices;
  sessionManager: SessionManager;
  sessionStartEvent?: SessionStartEvent;
  model?: Model;
  thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  scopedModels?: Array<{ model: Model; thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" }>;
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
  sessionDir: string;
  authStorage: AuthStorage;
  settingsManager: SettingsManager;
  modelRegistry: DefaultModelRegistry;
  resourceLoader: DefaultResourceLoader;
  diagnostics: AgentSessionRuntimeDiagnostic[];
}

/**
 * Create cwd-bound runtime services
 */
export async function createAgentSessionServices(
  options: CreateAgentSessionServicesOptions
): Promise<AgentSessionServices> {
  const cwd = options.cwd;
  const agentDir = options.agentDir ?? join(homedir(), ".pi", "agent");

  // Ensure directories exist
  if (!existsSync(agentDir)) {
    mkdirSync(agentDir, { recursive: true });
  }

  // Create auth storage
  const authStorage = options.authStorage ?? AuthStorage.create(join(agentDir, "auth.json"));

  // Create settings manager
  const settingsManager = options.settingsManager ?? SettingsManager.create(cwd, agentDir);

  // Determine session directory
  const sessionDir = settingsManager.getSessionDir() ?? join(agentDir, "sessions");
  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }

  // Create model registry
  const modelRegistry = options.modelRegistry ?? new DefaultModelRegistry();

  // Create resource loader
  const resourceLoader = options.resourceLoader ?? new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
  });

  const diagnostics: AgentSessionRuntimeDiagnostic[] = [];

  return {
    cwd,
    agentDir,
    sessionDir,
    authStorage,
    settingsManager,
    modelRegistry,
    resourceLoader,
    diagnostics,
  };
}

/**
 * Wrap built-in tool's execute method as handler
 */
function wrapBuiltinTool(tool: any): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.schema,
    handler: async (input: any, context: any) => {
      return tool.execute(input, context);
    },
  };
}

/**
 * Create an AgentSession from previously created services
 */
export async function createAgentSessionFromServices(
  options: CreateAgentSessionFromServicesOptions
): Promise<AgentSession> {
  const { services, sessionManager, sessionStartEvent, model, thinkingLevel, scopedModels, tools, noTools, customTools } = options;

  // Determine model to use
  let resolvedModel: Model;
  if (model) {
    resolvedModel = model;
  } else {
    // Get default model from settings
    const defaultProvider = services.settingsManager.getDefaultProvider();
    const defaultModelId = services.settingsManager.getDefaultModel();

    if (!defaultProvider || !defaultModelId) {
      throw new Error("No model specified and no default model configured in settings");
    }

    const found = services.modelRegistry.find(defaultProvider, defaultModelId);
    if (!found) {
      throw new Error(`Model ${defaultProvider}/${defaultModelId} not found in registry`);
    }
    resolvedModel = found;
  }

  // Build tool definitions - convert built-in tools to ToolDefinition format
  const builtInTools: ToolDefinition[] = noTools === "all"
    ? []
    : [
        wrapBuiltinTool(createBashToolDefinition()),
        wrapBuiltinTool(createReadToolDefinition()),
        wrapBuiltinTool(createWriteToolDefinition()),
        wrapBuiltinTool(createEditToolDefinition()),
        wrapBuiltinTool(createLsToolDefinition()),
      ];

  // Create Agent with built-in tools only
  // AgentSession will register customTools separately
  const agent = new Agent(resolvedModel, builtInTools, {
    maxRounds: 10,
    verbose: false,
    toolTimeout: DEFAULT_TOOL_TIMEOUT,
    cacheResults: true,
    toolExecutionStrategy: "parallel",
    contextBuilder: {
      maxTokens: 128000,
      reservedTokens: 4096,
      minMessages: 5,
      enableMemoryInjection: true,
    },
    executor: {
      timeout: DEFAULT_TOOL_TIMEOUT,
      cacheEnabled: true,
      toolExecutionStrategy: "parallel",
    },
    debug: false,
  });

  // Create AgentSession - it will add customTools to agent via _registerTools
  const session = new AgentSession({
    agent,
    sessionManager,
    settingsManager: services.settingsManager,
    cwd: services.cwd,
    resourceLoader: services.resourceLoader,
    modelRegistry: services.modelRegistry,
    scopedModels,
    customTools,
  });

  // Set initial model
  await session.setModel(resolvedModel);

  // Set default thinking level from settings
  const defaultThinkingLevel = services.settingsManager.getDefaultThinkingLevel();
  if (defaultThinkingLevel) {
    session.setThinkingLevel(defaultThinkingLevel);
  }

  return session;
}
