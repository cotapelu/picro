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
import { SettingsManager } from "../runtime/settings-manager.js";
import { DefaultModelRegistry } from "./model-registry.js";
import { DefaultResourceLoader } from "../runtime/resource-loader.js";
import { SessionManager } from "../session/session-manager.js";
import { Agent } from "../agent/agent.js";
import { AgentSession } from "../session/agent-session.js";
import { DEFAULT_TOOL_TIMEOUT } from "./defaults.js";
import { discoverAndLoadExtensions } from "../extensions/loader.js";
import { ExtensionRunner, createExtensionRuntime } from "../extensions/runner.js";
import type { ToolDefinition, ToolContext } from "../agent/types.js";

import {
  createBashToolDefinition,
} from "../tools/bash-tool.js";
import { createReadToolDefinition } from "../tools/read.js";
import { createWriteToolDefinition } from "../tools/write.js";
import { createEditToolDefinition } from "../tools/edit.js";
import { createLsToolDefinition } from "../tools/ls.js";

import type { Model } from "../llm/index.js";

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
  resourceLoaderOptions?: {
    additionalExtensionPaths?: string[];
    additionalSkillPaths?: string[];
    additionalPromptTemplatePaths?: string[];
    additionalThemePaths?: string[];
    noExtensions?: boolean;
    noSkills?: boolean;
    noPromptTemplates?: boolean;
    noThemes?: boolean;
    noContextFiles?: boolean;
    systemPrompt?: string;
    appendSystemPrompt?: string[];
  };
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
  extensionRunner?: any;
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

  // Patch missing methods for pi-coding-agent compatibility
  const smAny = settingsManager as any;
  smAny.getShowHardwareCursor = smAny.getShowHardwareCursor ?? (() => false);
  smAny.setShowHardwareCursor = smAny.setShowHardwareCursor ?? ((show: boolean) => {});
  smAny.getClearOnShrink = smAny.getClearOnShrink ?? (() => false);
  smAny.setClearOnShrink = smAny.setClearOnShrink ?? (() => {});
  // Additional pi settings methods (stubs)
  smAny.getEditorPaddingX = smAny.getEditorPaddingX ?? (() => 0);
  smAny.setEditorPaddingX = smAny.setEditorPaddingX ?? (() => {});
  smAny.getAutocompleteMaxVisible = smAny.getAutocompleteMaxVisible ?? (() => 10);
  smAny.setAutocompleteMaxVisible = smAny.setAutocompleteMaxVisible ?? (() => {});
  smAny.getAutocompleteProvider = smAny.getAutocompleteProvider ?? (() => ({ getOptions: () => [] }));
  smAny.setAutocompleteProvider = smAny.setAutocompleteProvider ?? (() => {});
  smAny.getAutocompleteSource = smAny.getAutocompleteSource ?? (() => ['builtin']);
  smAny.setAutocompleteSource = smAny.setAutocompleteSource ?? (() => {});
  smAny.getHttpIdleTimeoutMs = smAny.getHttpIdleTimeoutMs ?? (() => 30000);
  smAny.setHttpIdleTimeoutMs = smAny.setHttpIdleTimeoutMs ?? (() => {});
  // Add more stubs as needed
  

  // Determine session directory
  const sessionDir = settingsManager.getSessionDir() ?? join(agentDir, "sessions");
  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }

  // Create model registry
  const modelRegistry = options.modelRegistry ?? new DefaultModelRegistry(authStorage);

  // Create resource loader
  const resourceLoader = options.resourceLoader ?? new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
    ...(options.resourceLoaderOptions ?? {}),
  });

  const diagnostics: AgentSessionRuntimeDiagnostic[] = [];

  // Reload resources and set up extensions
  let extensionRunner: any;
  try {
    await resourceLoader.reload();
    const extensionsResult = resourceLoader.getExtensions();
    extensionRunner = new ExtensionRunner(extensionsResult.runtime);
    extensionRunner.loadExtensions(extensionsResult);
    // Register any providers from extensions
    for (const { name, config, extensionPath } of extensionsResult.runtime.pendingProviderRegistrations) {
      try {
        modelRegistry.registerProvider(name, config);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        diagnostics.push({
          type: "error",
          message: `Extension "${extensionPath}" error: ${message}`,
        });
      }
    }
    extensionsResult.runtime.pendingProviderRegistrations = [];
    // Apply extension flag values if provided
    if (options.extensionFlagValues) {
      const registeredFlags = new Map<string, { type: "boolean" | "string" }>();
      for (const ext of extensionsResult.extensions) {
        for (const [name, flag] of ext.flags) {
          registeredFlags.set(name, { type: flag.type });
        }
      }
      for (const [name, value] of options.extensionFlagValues) {
        const flag = registeredFlags.get(name);
        if (!flag) {
          diagnostics.push({ type: "error", message: `Unknown option: --${name}` });
          continue;
        }
        if (flag.type === "boolean") {
          extensionsResult.runtime.flagValues.set(name, true);
        } else {
          if (typeof value === "string") {
            extensionsResult.runtime.flagValues.set(name, value);
          } else {
            diagnostics.push({ type: "error", message: `Extension flag "--${name}" requires a value` });
          }
        }
      }
    }
  } catch (error) {
    // Extensions are optional, so ignore errors
    extensionRunner = new ExtensionRunner(createExtensionRuntime());
  }

  return {
    cwd,
    agentDir,
    sessionDir,
    authStorage,
    settingsManager,
    modelRegistry,
    resourceLoader,
    diagnostics,
    extensionRunner,
  };
}

/**
 * Wrap built-in tool's execute method as handler
 */
function wrapBuiltinTool(tool: any): ToolDefinition {
  // Determine parameters: use tool.parameters if present, else tool.schema
  const parameters = tool.parameters ?? tool.schema;
  // Determine handler: use tool.handler if present, else if tool.execute exists, wrap it.
  let handler;
  if (tool.handler) {
    handler = tool.handler;
  } else if (tool.execute) {
    handler = async (args: Record<string, unknown>, context: ToolContext) => {
      return tool.execute(args, context);
    };
  } else {
    throw new Error(`Tool ${tool.name} has no handler or execute method`);
  }

  const def: ToolDefinition = {
    name: tool.name,
    description: tool.description,
    parameters,
    handler,
  };
  // Preserve optional fields if present
  if (tool.promptSnippet) def.promptSnippet = tool.promptSnippet;
  if (tool.promptGuides) def.promptGuides = tool.promptGuides;
  if (tool.label) def.label = tool.label;
  if (tool.executionMode) def.executionMode = tool.executionMode;
  return def;
}

/**
 * Create an AgentSession from previously created services
 */
export async function createAgentSessionFromServices(
  options: CreateAgentSessionFromServicesOptions
): Promise<AgentSession> {
  const { services, sessionManager, sessionStartEvent, model, thinkingLevel, scopedModels, tools, noTools, customTools } = options;
  const cwd = sessionManager.getCwd();

  // Determine model to use (can be undefined for interactive mode)
  let resolvedModel: Model | undefined;
  if (model) {
    resolvedModel = model;
  } else {
    // Try to get default model from settings (but don't throw if not configured)
    const defaultProvider = services.settingsManager.getDefaultProvider();
    const defaultModelId = services.settingsManager.getDefaultModel();

    if (defaultProvider && defaultModelId) {
      const found = services.modelRegistry.find(defaultProvider, defaultModelId);
      if (found) {
        resolvedModel = found;
      }
    }
  }

  // Build tool definitions - convert built-in tools to ToolDefinition format
  const builtInTools: ToolDefinition[] = noTools === "all"
    ? []
    : [
        wrapBuiltinTool(createBashToolDefinition(cwd)),
        wrapBuiltinTool(createReadToolDefinition(cwd)),
        wrapBuiltinTool(createWriteToolDefinition(cwd)),
        wrapBuiltinTool(createEditToolDefinition(cwd)),
        wrapBuiltinTool(createLsToolDefinition(cwd)),
      ];

  // Create Agent with built-in tools only (model can be undefined)
  // AgentSession will register customTools separately
  const agent = new Agent(undefined, builtInTools, {
    maxRounds: 10000, // Effectively unlimited - LLM decides when to stop
    verbose: false,
    toolTimeout: DEFAULT_TOOL_TIMEOUT,
    cacheResults: true,
    toolExecutionStrategy: "parallel",
    loopStrategy: 'simple', // Use simple strategy: no ReAct prompting, direct tool calls
    contextBuilder: {
      maxTokens: 128000,
      reservedTokens: 4096,
      minMessages: 5,
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
    extensionRunner: services.extensionRunner,
  });

  // Set initial model only if we have one
  if (resolvedModel) {
    try {
      await session.setModel(resolvedModel);
    } catch (error) {
      // If model auth not configured, that's ok for interactive mode
      // The user can set model later after logging in
      console.warn(`Warning: Could not set initial model ${resolvedModel.provider}/${resolvedModel.id}:`, error instanceof Error ? error.message : error);
    }
  }

  // Set default thinking level from settings
  const defaultThinkingLevel = services.settingsManager.getDefaultThinkingLevel();
  if (defaultThinkingLevel) {
    session.setThinkingLevel(defaultThinkingLevel);
  }

  // Restore existing session messages into agent state for continuity
  const sessionContext = sessionManager.buildSessionContext();
  if (sessionContext.messages.length > 0) {
    // Set agent runner's history to the existing messages
    (session.agent as any).runner.state.history = sessionContext.messages;
  }

  return session;
}
