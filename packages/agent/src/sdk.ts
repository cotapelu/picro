// SPDX-License-Identifier: Apache-2.0
/**
 * SDK - Public API for creating AgentSession
 *
 * This is the main entry point for creating agent sessions.
 * Provides createAgentSession() and related factory functions.
 */

import { join } from "node:path";
import { Agent } from "./agent.js";
import { createAgentSessionServices, type CreateAgentSessionServicesOptions, type AgentSessionServices } from "./agent-session-services.js";
import { AgentSession } from "./agent-session.js";
import { SessionManager } from "./session-manager.js";
import type { SettingsManager } from "./settings-manager.js";
import type { ResourceLoader, DefaultResourceLoader } from "./resource-loader.js";
import type { ModelRegistry, DefaultModelRegistry } from "./model-registry.js";
import type { AuthStorage } from "./auth-storage.js";
import type { ToolDefinition } from "./types.js";
import type { Model, Api } from "@mariozechner/pi-ai";
import type { ThinkingLevel } from "./types.js";
import type { SessionStartEvent } from "./agent-session-runtime.js";

/**
 * Options for creating an AgentSession
 */
export interface CreateAgentSessionOptions {
  /** Working directory for project-local discovery. Default: process.cwd() */
  cwd?: string;
  
  /** Global config directory. Default: ~/.pi/agent */
  agentDir?: string;
  
  /** Auth storage for credentials */
  authStorage?: AuthStorage;
  
  /** Model registry */
  modelRegistry?: ModelRegistry;
  
  /** Model to use */
  model?: Model<Api>;
  
  /** Thinking level */
  thinkingLevel?: ThinkingLevel;
  
  /** Models available for cycling (Ctrl+P in interactive mode) */
  scopedModels?: Array<{ model: Model<Api>; thinkingLevel?: ThinkingLevel }>;
  
  /** Optional default tool suppression mode */
  noTools?: "all" | "builtin";
  
  /** Optional allowlist of tool names */
  tools?: string[];
  
  /** Custom tools to register */
  customTools?: ToolDefinition[];
  
  /** Resource loader */
  resourceLoader?: ResourceLoader;
  
  /** Session manager */
  sessionManager?: SessionManager;
  
  /** Settings manager */
  settingsManager?: SettingsManager;
  
  /** Session start event metadata */
  sessionStartEvent?: SessionStartEvent;
}

/**
 * Result from createAgentSession
 */
export interface CreateAgentSessionResult {
  /** The created session */
  session: AgentSession;
  
  /** Extensions result (for UI context) */
  extensionsResult: {
    extensions: any[];
    errors: Array<{ path: string; error: string }>;
  };
  
  /** Warning if session was restored with a different model */
  modelFallbackMessage?: string;
}

/**
 * Get default agent directory
 */
function getDefaultAgentDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  return join(homeDir, ".pi", "agent");
}

/**
 * Get default session directory
 */
function getDefaultSessionDir(cwd: string, agentDir: string): string {
  return join(agentDir, "sessions");
}

/**
 * Create an AgentSession with the specified options.
 * 
 * @example
 * ```typescript
 * // Minimal - uses defaults
 * const { session } = await createAgentSession();
 * 
 * // With explicit model
 * const { session } = await createAgentSession({
 *   model: getModel('anthropic', 'claude-opus-4-5'),
 *   thinkingLevel: 'high',
 * });
 * 
 * // Full control
 * const loader = new DefaultResourceLoader({
 *   cwd: process.cwd(),
 *   agentDir: getAgentDir(),
 *   settingsManager: SettingsManager.create(),
 * });
 * await loader.reload();
 * const { session } = await createAgentSession({
 *   model: myModel,
 *   tools: [readTool, bashTool],
 *   resourceLoader: loader,
 * });
 * ```
 */
export async function createAgentSession(
  options: CreateAgentSessionOptions = {}
): Promise<CreateAgentSessionResult> {
  const cwd = options.cwd ?? process.cwd();
  const agentDir = options.agentDir ?? getDefaultAgentDir();
  
  // Create or use provided services
  let services: AgentSessionServices;
  let resourceLoader: ResourceLoader;
  let settingsManager: SettingsManager;
  let modelRegistry: ModelRegistry;
  let authStorage: AuthStorage;
  
  if (options.resourceLoader && options.settingsManager && options.modelRegistry) {
    // Use provided services
    resourceLoader = options.resourceLoader;
    settingsManager = options.settingsManager;
    modelRegistry = options.modelRegistry;
    authStorage = options.authStorage!;
  } else {
    // Create services
    const servicesOptions: CreateAgentSessionServicesOptions = {
      cwd,
      agentDir,
      authStorage: options.authStorage,
      settingsManager: options.settingsManager,
      modelRegistry: options.modelRegistry,
    };
    
    services = await createAgentSessionServices(servicesOptions);
    resourceLoader = services.resourceLoader;
    settingsManager = services.settingsManager;
    modelRegistry = services.modelRegistry;
    authStorage = services.authStorage;
  }
  
  // Create or use provided session manager
  const sessionManager = options.sessionManager ?? SessionManager.create(cwd, getDefaultSessionDir(cwd, agentDir));
  
  // Get model - use provided or find from registry
  let model = options.model;
  let thinkingLevel = options.thinkingLevel ?? "medium";
  
  if (!model) {
    // Try to get default from settings
    const defaultProvider = settingsManager.getDefaultProvider();
    const defaultModelId = settingsManager.getDefaultModel();
    
    if (defaultProvider && defaultModelId) {
      model = modelRegistry.find(defaultProvider, defaultModelId);
    }
    
    // If still no model, try first available
    if (!model) {
      const availableModels = await modelRegistry.getAvailable();
      if (availableModels.length > 0) {
        model = availableModels[0];
      }
    }
  }
  
  // Check if model has auth
  let modelFallbackMessage: string | undefined;
  if (model && !modelRegistry.hasConfiguredAuth(model)) {
    modelFallbackMessage = `No API key configured for ${model.provider}`;
    model = undefined;
  }
  
  // Clamp thinking level to model capabilities
  if (model && !model.reasoning) {
    thinkingLevel = "off";
  }
  
  // Get tools
  const allowedToolNames = options.tools ?? (options.noTools === "all" ? [] : undefined);
  const initialActiveToolNames = options.tools 
    ? [...options.tools] 
    : options.noTools 
      ? [] 
      : ["read", "write", "edit", "grep", "find", "ls"];
  
  // Create Agent instance
  const agent = new Agent(
    model as any,
    [], // Tools will be registered separately
    {
      maxRounds: 10,
      enableLogging: true,
    }
  );
  
  // Register custom tools if provided
  if (options.customTools) {
    for (const tool of options.customTools) {
      agent.registerTool(tool);
    }
  }
  
  // Register built-in tools based on allowlist
  for (const toolName of initialActiveToolNames) {
    // Tool registration would happen here with actual tool implementations
  }
  
  // Create AgentSession
  const session = new AgentSession({
    agent,
    sessionManager,
    settingsManager,
    cwd,
    scopedModels: options.scopedModels,
    resourceLoader,
    customTools: options.customTools,
    modelRegistry,
    initialActiveToolNames,
    allowedToolNames,
  });
  
  // Set model if provided
  if (model) {
    await session.setModel(model);
    session.setThinkingLevel(thinkingLevel);
  }
  
  // Get extensions result
  const extensionsResult = resourceLoader.getExtensions();
  
  return {
    session,
    extensionsResult,
    modelFallbackMessage,
  };
}

/**
 * Create AgentSessionServices - factory for creating cwd-bound services
 */
export { createAgentSessionServices } from "./agent-session-services.js";
export type { CreateAgentSessionServicesOptions, AgentSessionServices } from "./agent-session-services.js";

// Re-export for convenience
export { AgentSession } from "./agent-session.js";
export type { AgentSessionConfig } from "./agent-session-types.js";

// Tool factories
export { createAgentSessionFromServices } from "./agent-session-services.js";
export type { CreateAgentSessionFromServicesOptions } from "./agent-session-services.js";