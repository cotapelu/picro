"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * AgentSessionServices - Cwd-bound runtime services
 *
 * Provides all cwd-bound services needed by AgentSession
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentSessionServices = createAgentSessionServices;
exports.createAgentSessionFromServices = createAgentSessionFromServices;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const auth_storage_js_1 = require("./auth-storage.js");
const settings_manager_js_1 = require("../runtime/settings-manager.js");
const model_registry_js_1 = require("./model-registry.js");
const resource_loader_js_1 = require("../runtime/resource-loader.js");
const agent_js_1 = require("../agent/agent.js");
const agent_session_js_1 = require("../session/agent-session.js");
const defaults_js_1 = require("./defaults.js");
const runner_js_1 = require("../extensions/runner.js");
const bash_tool_js_1 = require("../tools/bash-tool.js");
const read_js_1 = require("../tools/read.js");
const write_js_1 = require("../tools/write.js");
const edit_js_1 = require("../tools/edit.js");
const ls_js_1 = require("../tools/ls.js");
/**
 * Create cwd-bound runtime services
 */
async function createAgentSessionServices(options) {
    const cwd = options.cwd;
    const agentDir = options.agentDir ?? (0, node_path_1.join)((0, node_os_1.homedir)(), ".pi", "agent");
    // Ensure directories exist
    if (!(0, node_fs_1.existsSync)(agentDir)) {
        (0, node_fs_1.mkdirSync)(agentDir, { recursive: true });
    }
    // Create auth storage
    const authStorage = options.authStorage ?? auth_storage_js_1.AuthStorage.create((0, node_path_1.join)(agentDir, "auth.json"));
    // Create settings manager
    const settingsManager = options.settingsManager ?? settings_manager_js_1.SettingsManager.create(cwd, agentDir);
    // Determine session directory
    const sessionDir = settingsManager.getSessionDir() ?? (0, node_path_1.join)(agentDir, "sessions");
    if (!(0, node_fs_1.existsSync)(sessionDir)) {
        (0, node_fs_1.mkdirSync)(sessionDir, { recursive: true });
    }
    // Create model registry
    const modelRegistry = options.modelRegistry ?? new model_registry_js_1.DefaultModelRegistry();
    // Create resource loader
    const resourceLoader = options.resourceLoader ?? new resource_loader_js_1.DefaultResourceLoader({
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
        extensionRunner = new runner_js_1.ExtensionRunner(extensionsResult.runtime);
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
        extensionRunner = new runner_js_1.ExtensionRunner((0, runner_js_1.createExtensionRuntime)());
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
async function createAgentSessionFromServices(options) {
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
            wrapBuiltinTool((0, bash_tool_js_1.createBashToolDefinition)(cwd)),
            wrapBuiltinTool((0, read_js_1.createReadToolDefinition)(cwd)),
            wrapBuiltinTool((0, write_js_1.createWriteToolDefinition)(cwd)),
            wrapBuiltinTool((0, edit_js_1.createEditToolDefinition)(cwd)),
            wrapBuiltinTool((0, ls_js_1.createLsToolDefinition)(cwd)),
        ];
    // Create Agent with built-in tools only (model can be undefined)
    // AgentSession will register customTools separately
    const agent = new agent_js_1.Agent(undefined, builtInTools, {
        maxRounds: 10,
        verbose: false,
        toolTimeout: defaults_js_1.DEFAULT_TOOL_TIMEOUT,
        cacheResults: true,
        toolExecutionStrategy: "parallel",
        contextBuilder: {
            maxTokens: 128000,
            reservedTokens: 4096,
            minMessages: 5,
            enableMemoryInjection: true,
        },
        executor: {
            timeout: defaults_js_1.DEFAULT_TOOL_TIMEOUT,
            cacheEnabled: true,
            toolExecutionStrategy: "parallel",
        },
        debug: false,
    });
    // Create AgentSession - it will add customTools to agent via _registerTools
    const session = new agent_session_js_1.AgentSession({
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