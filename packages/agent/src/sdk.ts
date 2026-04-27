// SPDX-License-Identifier: Apache-2.0
/**
 * SDK - Public API for creating AgentSession
 */

import { join } from "node:path";

import { Agent } from "./agent.js";
import { createAgentSessionServices, type CreateAgentSessionServicesOptions, type AgentSessionServices } from "./agent-session-services.js";
import { AgentSession } from "./agent-session.js";
import { SessionManager } from "./session-manager.js";
import { SettingsManager } from "./settings-manager.js";
import { type ThinkingLevel, type ToolDefinition } from "./types.js";
import { type ResourceLoader, type DefaultResourceLoader } from "./resource-loader.js";
import { createModelRegistry, type ModelRegistry, type DefaultModelRegistry, type ModelEntry } from "./model-registry.js";
import type { AuthStorage } from "./auth-storage.js";
import type { SessionStartEvent } from "./agent-session-runtime.js";

export interface CreateAgentSessionOptions {
  cwd?: string;
  agentDir?: string;
  authStorage?: AuthStorage;
  modelRegistry?: ModelRegistry;
  model?: ModelEntry;
  thinkingLevel?: ThinkingLevel;
  scopedModels?: Array<{ model: ModelEntry; thinkingLevel?: ThinkingLevel }>;
  noTools?: "all" | "builtin";
  tools?: string[];
  customTools?: ToolDefinition[];
  resourceLoader?: ResourceLoader;
  sessionManager?: SessionManager;
  settingsManager?: SettingsManager;
  sessionStartEvent?: SessionStartEvent;
}

export interface CreateAgentSessionResult {
  session: AgentSession;
  extensionsResult: { extensions: any[]; errors: Array<{ path: string; error: string }> };
  modelFallbackMessage?: string;
}

function getDefaultAgentDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  return join(homeDir, ".pi", "agent");
}

function getDefaultSessionDir(cwd: string, agentDir: string): string {
  return join(agentDir, "sessions");
}

export async function createAgentSession(
  options: CreateAgentSessionOptions = {}
): Promise<CreateAgentSessionResult> {
  const cwd = options.cwd ?? process.cwd();
  const agentDir = options.agentDir ?? getDefaultAgentDir();
  
  let services: AgentSessionServices;
  let resourceLoader: ResourceLoader;
  let settingsManager: SettingsManager;
  let modelRegistry: ModelRegistry;
  
  if (options.resourceLoader && options.settingsManager && options.modelRegistry) {
    resourceLoader = options.resourceLoader;
    settingsManager = options.settingsManager;
    modelRegistry = options.modelRegistry;
  } else {
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
  }
  
  const sessionManager = options.sessionManager ?? SessionManager.create(cwd, getDefaultSessionDir(cwd, agentDir));
  
  let model = options.model;
  let thinkingLevel = options.thinkingLevel ?? "medium";
  
  if (!model && modelRegistry) {
    const defaultProvider = settingsManager.getDefaultProvider();
    const defaultModelId = settingsManager.getDefaultModel();
    
    if (defaultProvider && defaultModelId) {
      model = modelRegistry.find(defaultProvider, defaultModelId);
    }
    
    if (!model) {
      const availableModels = await modelRegistry.getAvailable();
      if (availableModels.length > 0) {
        model = availableModels[0];
      }
    }
  }
  
  let modelFallbackMessage: string | undefined;
  if (model && !modelRegistry.hasConfiguredAuth(model)) {
    modelFallbackMessage = `No API key for ${model.provider}`;
    model = undefined;
  }
  
  if (model && !model.reasoning) {
    thinkingLevel = "off";
  }
  
  const allowedToolNames = options.tools ?? (options.noTools === "all" ? [] : undefined);
  const initialActiveToolNames = options.tools 
    ? [...options.tools] 
    : options.noTools 
      ? [] 
      : ["read", "write", "edit", "grep", "find", "ls"];
  
  const agent = new Agent(
    model as any,
    [],
    { maxRounds: 10, enableLogging: true }
  );
  
  if (options.customTools) {
    for (const tool of options.customTools) {
      agent.registerTool(tool);
    }
  }
  
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
  
  if (model) {
    await session.setModel(model as any);
    session.setThinkingLevel(thinkingLevel);
  }
  
  const extensionsResult = resourceLoader.getExtensions();
  
  return {
    session,
    extensionsResult,
    modelFallbackMessage,
  };
}

export { createAgentSessionServices } from "./agent-session-services.js";
export type { CreateAgentSessionServicesOptions, AgentSessionServices } from "./agent-session-services.js";
export { AgentSession } from "./agent-session.js";
export type { AgentSessionConfig } from "./agent-session-types.js";
export { createAgentSessionFromServices } from "./agent-session-services.js";
export type { CreateAgentSessionFromServicesOptions } from "./agent-session-services.js";

export { type ResourceLoader, type DefaultResourceLoader } from "./resource-loader.js";
export { createModelRegistry, type ModelRegistry, type DefaultModelRegistry, type ModelEntry } from "./model-registry.js";