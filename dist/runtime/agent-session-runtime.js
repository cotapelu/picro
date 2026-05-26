"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * AgentSessionRuntime - Owns the current AgentSession plus its cwd-bound services
 *
 * This is the highest-level API for creating and managing agent sessions.
 * It serves as the composition root for the entire agent system.
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentSessionRuntime = void 0;
exports.createAgentSessionRuntime = createAgentSessionRuntime;
const node_fs_1 = require("node:fs");
const agent_session_services_js_1 = require("../session/agent-session-services.js");
const session_manager_js_1 = require("../session/session-manager.js");
/**
 * AgentSessionRuntime - The top-level runtime that owns everything
 */
class AgentSessionRuntime {
    _agent; // Agent - avoid circular import
    _session;
    _services;
    _cwd;
    _disposed = false;
    _beforeSessionInvalidate;
    _rebindSession;
    constructor(agent, session, services) {
        this._agent = agent;
        this._session = session;
        this._services = services;
        this._cwd = services.cwd;
    }
    /**
     * Get the current session (for internal use only)
     */
    get session() {
        return this._session;
    }
    /**
     * Get the current services
     */
    get services() {
        return this._services;
    }
    /**
     * Get the current working directory
     */
    get cwd() {
        return this._cwd;
    }
    /**
     * Get current thinking level
     */
    get thinkingLevel() {
        return this._session.thinkingLevel;
    }
    /**
     * Set thinking level
     */
    setThinkingLevel(level) {
        this._session.setThinkingLevel(level);
    }
    /**
     * Get auth storage
     */
    get authStorage() {
        return this._services.authStorage;
    }
    /**
     * Get settings manager
     */
    get settings() {
        return this._services.settingsManager;
    }
    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        // Try using clipboardy if available, fallback to pbcopy/paste/xclip
        try {
            // Dynamic import to avoid adding dependency if not used
            const clipboardy = await Promise.resolve().then(() => __importStar(require("clipboardy")));
            await clipboardy.default.write(text);
        }
        catch {
            // Fallback to native commands
            const isWin = process.platform === "win32";
            if (isWin) {
                const { execSync } = await Promise.resolve().then(() => __importStar(require("node:child_process")));
                execSync(`echo ${JSON.stringify(text)} | clip`, { stdio: "ignore" });
            }
            else {
                const { execSync } = await Promise.resolve().then(() => __importStar(require("node:child_process")));
                if (process.env.CI) {
                    // In CI, clipboard may not work; just log
                    console.log("[clipboard] ", text);
                }
                else {
                    try {
                        execSync(`echo ${JSON.stringify(text)} | pbcopy`, { stdio: "ignore" });
                    }
                    catch {
                        try {
                            execSync(`echo ${JSON.stringify(text)} | xclip -selection clipboard`, { stdio: "ignore" });
                        }
                        catch {
                            console.warn("Clipboard not available");
                        }
                    }
                }
            }
        }
    }
    /**
     * Get diagnostics collected during setup
     */
    get diagnostics() {
        return this._services.diagnostics;
    }
    /**
     * Get model fallback message if any
     */
    get modelFallbackMessage() {
        return undefined;
    }
    /**
     * Switch to a different session file
     */
    async switchSession(sessionPath, options) {
        if (this._disposed) {
            return { cancelled: true };
        }
        try {
            // Call rebind handler if set
            if (this._rebindSession) {
                await this._rebindSession(sessionPath);
            }
            const cwd = options?.cwdOverride ?? this._cwd;
            const newSessionManager = session_manager_js_1.SessionManager.open(sessionPath, this._services.sessionDir, cwd);
            // Create new session with same agent and services
            this._session = await (0, agent_session_services_js_1.createAgentSessionFromServices)({
                services: this._services,
                sessionManager: newSessionManager,
            });
            return { cancelled: false };
        }
        catch (error) {
            console.error("Failed to switch session:", error);
            return { cancelled: true };
        }
    }
    /**
     * Create a new session
     */
    async newSession(options) {
        if (this._disposed) {
            return { cancelled: true };
        }
        try {
            // Call before invalidate handler if set
            if (this._beforeSessionInvalidate) {
                this._beforeSessionInvalidate();
            }
            const newSessionManager = session_manager_js_1.SessionManager.continueRecent(this._cwd, this._services.sessionDir);
            newSessionManager.newSession({ parentSession: options?.parentSession });
            if (options?.setup) {
                await options.setup(newSessionManager);
            }
            // Create new session with same agent and services
            this._session = await (0, agent_session_services_js_1.createAgentSessionFromServices)({
                services: this._services,
                sessionManager: newSessionManager,
            });
            return { cancelled: false };
        }
        catch (error) {
            console.error("Failed to create new session:", error);
            return { cancelled: true };
        }
    }
    /**
     * Fork the current session at a specific entry
     */
    async fork(entryId, options) {
        if (this._disposed) {
            return { cancelled: true };
        }
        try {
            const position = options?.position ?? "at";
            const branchFromId = position === "before"
                ? this._session.sessionManager.getEntry(entryId)?.parentId ?? null
                : entryId;
            // Create branch summary
            const result = this._session.sessionManager.branchWithSummary(branchFromId, `Forked from entry ${entryId}`);
            return {
                cancelled: false,
                selectedText: result?.selectedText
            };
        }
        catch (error) {
            console.error("Failed to fork session:", error);
            return { cancelled: true };
        }
    }
    /**
     * List all sessions (local and global)
     */
    async listSessions() {
        if (this._disposed)
            return [];
        // List all sessions accessible to this cwd
        const local = await session_manager_js_1.SessionManager.list(this._cwd, this._services.sessionDir);
        const global = await session_manager_js_1.SessionManager.listAll();
        // Combine and dedupe by path
        const all = new Map();
        for (const s of local) {
            all.set(s.path, { id: s.id, path: s.path, cwd: s.cwd });
        }
        for (const s of global) {
            if (!all.has(s.path)) {
                all.set(s.path, { id: s.id, path: s.path, cwd: s.cwd });
            }
        }
        return Array.from(all.values());
    }
    /**
     * Import a session from JSONL file
     */
    async importFromJsonl(inputPath, cwdOverride) {
        if (this._disposed) {
            return { cancelled: true };
        }
        try {
            if (!(0, node_fs_1.existsSync)(inputPath)) {
                console.error(`Session file not found: ${inputPath}`);
                return { cancelled: true };
            }
            const content = require('node:fs').readFileSync(inputPath, "utf-8");
            const cwd = cwdOverride ?? this._cwd;
            const sessionDir = this._services.sessionDir;
            const newSessionManager = session_manager_js_1.SessionManager.importSession(cwd, sessionDir, content);
            // Create new session with same agent and services
            this._session = await (0, agent_session_services_js_1.createAgentSessionFromServices)({
                services: this._services,
                sessionManager: newSessionManager,
            });
            return { cancelled: false };
        }
        catch (error) {
            console.error("Failed to import session:", error);
            return { cancelled: true };
        }
    }
    /**
     * Dispose the runtime
     */
    async dispose() {
        if (this._disposed)
            return;
        // Call before invalidate handler
        if (this._beforeSessionInvalidate) {
            this._beforeSessionInvalidate();
        }
        this._session.dispose();
        this._disposed = true;
    }
    /**
     * Set a handler that's called before a session is invalidated (new/fork/resume).
     * Used by UI to clean up extension state.
     */
    setBeforeSessionInvalidate(handler) {
        this._beforeSessionInvalidate = handler;
    }
    /**
     * Set a handler that's called to rebind extensions when switching sessions.
     */
    setRebindSession(handler) {
        this._rebindSession = handler;
    }
}
exports.AgentSessionRuntime = AgentSessionRuntime;
/**
 * Create initial runtime
 *
 * This is the main entry point for creating an AgentSessionRuntime.
 * It sets up all services and creates the initial session.
 */
async function createAgentSessionRuntime(createRuntime, options) {
    const cwd = options.cwd;
    const agentDir = options.agentDir;
    // Ensure agent directory exists
    if (!(0, node_fs_1.existsSync)(agentDir)) {
        (0, node_fs_1.mkdirSync)(agentDir, { recursive: true });
    }
    // Create services
    const services = await (0, agent_session_services_js_1.createAgentSessionServices)({
        cwd,
        agentDir,
    });
    // Get or create session manager
    let sessionManager;
    if (options.sessionManager) {
        sessionManager = options.sessionManager;
    }
    else {
        // Try to continue recent session, or create new
        sessionManager = session_manager_js_1.SessionManager.continueRecent(cwd, services.sessionDir);
    }
    // Resolve model string to Model object if necessary
    let resolvedModel;
    if (options.model) {
        if (typeof options.model === 'string') {
            // Try to find the model in the registry
            // First, try with the default provider from settings if available
            const defaultProvider = services.settingsManager.getDefaultProvider();
            if (defaultProvider) {
                const model = services.modelRegistry.find(defaultProvider, options.model);
                if (model) {
                    resolvedModel = model;
                }
            }
            // If not found, search all providers
            if (!resolvedModel) {
                const providers = services.modelRegistry.getProviders();
                for (const provider of providers) {
                    const model = services.modelRegistry.find(provider, options.model);
                    if (model) {
                        resolvedModel = model;
                        break;
                    }
                }
            }
        }
        else {
            resolvedModel = options.model;
        }
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
    // Create session from services
    const session = await (0, agent_session_services_js_1.createAgentSessionFromServices)({
        services,
        sessionManager,
        sessionStartEvent: options.sessionStartEvent,
        model: resolvedModel,
        thinkingLevel: options.thinkingLevel,
        scopedModels: options.scopedModels,
        tools: options.tools,
        noTools: options.noTools,
        customTools: options.customTools,
    });
    // Extract agent from session (it's created inside)
    const agent = session['agent']; // Access private property for now
    // Create runtime
    const runtime = new AgentSessionRuntime(agent, session, services);
    // Call custom factory if provided (for extensions)
    if (createRuntime) {
        const result = await createRuntime({
            cwd,
            agentDir,
            sessionManager,
            sessionStartEvent: options.sessionStartEvent,
        });
        // Merge diagnostics
        if (result.diagnostics) {
            services.diagnostics.push(...result.diagnostics);
        }
    }
    return runtime;
}
//# sourceMappingURL=agent-session-runtime.js.map