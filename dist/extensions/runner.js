"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Extensions Runner - Run extensions and emit events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionRunner = void 0;
exports.createExtensionRuntime = createExtensionRuntime;
exports.emitSessionShutdownEvent = emitSessionShutdownEvent;
/**
 * Create extension runtime
 */
function createExtensionRuntime() {
    return {
        flagValues: new Map(),
        pendingProviderRegistrations: [],
    };
}
/**
 * ExtensionRunner - manages extension execution
 */
class ExtensionRunner {
    extensions = [];
    runtime;
    handlers = new Map();
    _uiContext;
    _commandContextActions;
    _errorListener;
    constructor(runtime) {
        this.runtime = runtime ?? createExtensionRuntime();
    }
    /**
     * Load extensions
     */
    loadExtensions(result) {
        this.extensions = result.extensions;
        this.runtime = result.runtime;
    }
    /**
     * Check if there are handlers for an event type
     */
    hasHandlers(eventType) {
        const handlers = this.handlers.get(eventType);
        return handlers !== undefined && handlers.size > 0;
    }
    /**
     * Register a handler for an event
     */
    on(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        this.handlers.get(eventType).add(handler);
        return () => {
            this.handlers.get(eventType)?.delete(handler);
        };
    }
    /**
     * Emit an event to all handlers
     */
    async emit(event) {
        const handlers = this.handlers.get(event.type);
        if (!handlers || handlers.size === 0) {
            return undefined;
        }
        let result;
        for (const handler of handlers) {
            try {
                result = await handler(event);
            }
            catch (error) {
                console.error(`Error in handler for ${event.type}:`, error);
            }
        }
        return result;
    }
    /**
     * Emit before_agent_start event
     */
    async emitBeforeAgentStart(prompt, images, systemPrompt, options) {
        return this.emit({
            type: "before_agent_start",
            prompt,
            images,
            systemPrompt,
            ...options,
        });
    }
    /**
     * Emit input event
     */
    async emitInput(text, images, source) {
        const result = await this.emit({
            type: "input",
            text,
            images,
            source,
        });
        return result ?? { action: "pass" };
    }
    /**
     * Get a command by name
     */
    getCommand(name) {
        for (const ext of this.extensions) {
            const command = ext.commands.get(name);
            if (command) {
                return command;
            }
        }
        return undefined;
    }
    /**
     * Get all commands
     */
    getCommands() {
        const commands = [];
        for (const ext of this.extensions) {
            for (const cmd of ext.commands.values()) {
                commands.push(cmd);
            }
        }
        return commands;
    }
    /**
     * Get all tools from extensions
     */
    getTools() {
        const tools = [];
        for (const ext of this.extensions) {
            for (const tool of ext.tools.values()) {
                tools.push(tool);
            }
        }
        return tools;
    }
    /**
     * Get flag value
     */
    getFlag(name) {
        return this.runtime.flagValues.get(name);
    }
    /**
     * Set flag value
     */
    setFlag(name, value) {
        this.runtime.flagValues.set(name, value);
    }
    /**
     * Invalidate the runner
     */
    invalidate(message) {
        // Clear all handlers
        this.handlers.clear();
        this.extensions = [];
    }
    // =========================================================================
    // UI Binding Support
    // =========================================================================
    setUIContext(uiContext) {
        this._uiContext = uiContext;
    }
    bindCommandContext(actions) {
        this._commandContextActions = actions;
    }
    bindCore(actions) {
        Object.assign(this.runtime, actions);
    }
    onError(handler) {
        // For simplicity store single; should support multiple
        this._errorListener = handler;
        return () => { this._errorListener = undefined; };
    }
    createContext() {
        return {
            ui: this._uiContext,
            hasUI: !!this._uiContext,
            cwd: '',
            sessionManager: null,
            modelRegistry: null,
            model: undefined,
            isIdle: () => false,
            signal: undefined,
            abort: () => { },
            hasPendingMessages: () => false,
            shutdown: () => { },
            getContextUsage: () => undefined,
            compact: () => { },
            getSystemPrompt: () => '',
        };
    }
    /**
     * Create command context
     */
    createCommandContext() {
        // Will be populated with actual implementation
        return {};
    }
    // =========================================================================
    // UI Provider Methods (stubs for extension UI integration)
    // =========================================================================
    /**
     * Provide autocomplete suggestions
     */
    async provideAutocomplete(context) {
        return [];
    }
    /**
     * Render a message (for extended message rendering)
     */
    async renderMessage(message, options) {
        return null;
    }
    /**
     * Render tool execution result
     */
    async renderToolExecution(toolName, input, output, options) {
        return {};
    }
    /**
     * Create a widget
     */
    async createWidget(options) {
        // no-op
    }
    /**
     * Select string (e.g., file picker)
     */
    async selectString(options) {
        return undefined;
    }
}
exports.ExtensionRunner = ExtensionRunner;
/**
 * Emit session shutdown event
 */
async function emitSessionShutdownEvent(runner, event) {
    await runner.emit(event);
}
//# sourceMappingURL=runner.js.map