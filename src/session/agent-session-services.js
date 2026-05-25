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
import { Agent } from "../agent/agent.js";
import { AgentSession } from "../session/agent-session.js";
import { DEFAULT_TOOL_TIMEOUT } from "./defaults.js";
import { ExtensionRunner, createExtensionRuntime } from "../extensions/runner.js";
import { createBashToolDefinition, } from "../tools/bash-tool.js";
import { createReadToolDefinition } from "../tools/read.js";
import { createWriteToolDefinition } from "../tools/write.js";
import { createEditToolDefinition } from "../tools/edit.js";
import { createLsToolDefinition } from "../tools/ls.js";
/**
 * Create cwd-bound runtime services
 */
export async function createAgentSessionServices(options) {
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
        ...(options.resourceLoaderOptions ?? {}),
    });
    const diagnostics = [];
    // Reload resources and set up extensions
    let extensionRunner;
    try {
        await resourceLoader.reload();
        const extensionsResult = resourceLoader.getExtensions();
        extensionRunner = new ExtensionRunner(extensionsResult.runtime);
        extensionRunner.loadExtensions(extensionsResult);
        // Register any providers from extensions
        for (const { name, config, extensionPath } of extensionsResult.runtime.pendingProviderRegistrations) {
            try {
                modelRegistry.registerProvider(name, config);
            }
            catch (error) {
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
            const registeredFlags = new Map();
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
                }
                else {
                    if (typeof value === "string") {
                        extensionsResult.runtime.flagValues.set(name, value);
                    }
                    else {
                        diagnostics.push({ type: "error", message: `Extension flag "--${name}" requires a value` });
                    }
                }
            }
        }
    }
    catch (error) {
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
function wrapBuiltinTool(tool) {
    return {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema,
        handler: async (input, context) => {
            return tool.execute(input, context);
        },
    };
}
/**
 * Create an AgentSession from previously created services
 */
export async function createAgentSessionFromServices(options) {
    const { services, sessionManager, sessionStartEvent, model, thinkingLevel, scopedModels, tools, noTools, customTools } = options;
    const cwd = sessionManager.getCwd();
    // Determine model to use (can be undefined for interactive mode)
    let resolvedModel;
    if (model) {
        resolvedModel = model;
    }
    else {
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
    const builtInTools = noTools === "all"
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
        extensionRunner: services.extensionRunner,
    });
    // Set initial model only if we have one
    if (resolvedModel) {
        try {
            await session.setModel(resolvedModel);
        }
        catch (error) {
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
    return session;
}
//# sourceMappingURL=agent-session-services.js.map