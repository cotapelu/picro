/**
 * AgentSessionRuntime - Owns the current AgentSession plus its cwd-bound services
 *
 * This is the highest-level API for creating and managing agent sessions.
 * It serves as the composition root for the entire agent system.
 */
import { AgentSession } from "../session/agent-session.js";
import type { AgentSessionServices } from "../session/agent-session-services.js";
import { SessionManager } from "../session/session-manager.js";
/**
 * AgentSessionRuntimeDiagnostic - Non-fatal issues collected during runtime creation
 */
export interface AgentSessionRuntimeDiagnostic {
    type: "info" | "warning" | "error";
    message: string;
}
/**
 * CreateAgentSessionRuntimeFactory - Factory for creating runtime
 */
export type CreateAgentSessionRuntimeFactory = (options: {
    cwd: string;
    agentDir: string;
    sessionManager: SessionManager;
    sessionStartEvent?: SessionStartEvent;
}) => Promise<CreateAgentSessionRuntimeResult>;
/**
 * Result returned by runtime creation
 */
export interface CreateAgentSessionRuntimeResult {
    session: AgentSession;
    services: AgentSessionServices;
    diagnostics: AgentSessionRuntimeDiagnostic[];
    modelFallbackMessage?: string;
}
/**
 * Session start event metadata
 */
export interface SessionStartEvent {
    type: "session_start";
    reason: "startup" | "new" | "resume" | "fork";
    previousSessionFile?: string;
}
/**
 * AgentSessionRuntime - The top-level runtime that owns everything
 */
export declare class AgentSessionRuntime implements AgentSessionRuntime {
    private _agent;
    private _session;
    private _services;
    private _cwd;
    private _disposed;
    private _beforeSessionInvalidate?;
    private _rebindSession?;
    constructor(agent: any, session: AgentSession, services: AgentSessionServices);
    /**
     * Get the current session (for internal use only)
     */
    get session(): AgentSession;
    /**
     * Get the current services
     */
    get services(): AgentSessionServices;
    /**
     * Get the current working directory
     */
    get cwd(): string;
    /**
     * Get current thinking level
     */
    get thinkingLevel(): "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
    /**
     * Set thinking level
     */
    setThinkingLevel(level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh"): void;
    /**
     * Get auth storage
     */
    get authStorage(): any;
    /**
     * Get settings manager
     */
    get settings(): any;
    /**
     * Copy text to clipboard
     */
    copyToClipboard(text: string): Promise<void>;
    /**
     * Get diagnostics collected during setup
     */
    get diagnostics(): readonly AgentSessionRuntimeDiagnostic[];
    /**
     * Get model fallback message if any
     */
    get modelFallbackMessage(): string | undefined;
    /**
     * Switch to a different session file
     */
    switchSession(sessionPath: string, options?: {
        cwdOverride?: string;
        withSession?: boolean;
    }): Promise<{
        cancelled: boolean;
    }>;
    /**
     * Create a new session
     */
    newSession(options?: {
        parentSession?: string;
        setup?: (sessionManager: SessionManager) => Promise<void>;
    }): Promise<{
        cancelled: boolean;
    }>;
    /**
     * Fork the current session at a specific entry
     */
    fork(entryId: string, options?: {
        position?: "before" | "at";
    }): Promise<{
        cancelled: boolean;
        selectedText?: string;
    }>;
    /**
     * List all sessions (local and global)
     */
    listSessions(): Promise<Array<{
        id: string;
        path: string;
        cwd: string;
    }>>;
    /**
     * Import a session from JSONL file
     */
    importFromJsonl(inputPath: string, cwdOverride?: string): Promise<{
        cancelled: boolean;
    }>;
    /**
     * Dispose the runtime
     */
    dispose(): Promise<void>;
    /**
     * Set a handler that's called before a session is invalidated (new/fork/resume).
     * Used by UI to clean up extension state.
     */
    setBeforeSessionInvalidate(handler: () => void): void;
    /**
     * Set a handler that's called to rebind extensions when switching sessions.
     */
    setRebindSession(handler: (sessionPath?: string) => Promise<void>): void;
}
/**
 * Create initial runtime
 *
 * This is the main entry point for creating an AgentSessionRuntime.
 * It sets up all services and creates the initial session.
 */
export declare function createAgentSessionRuntime(createRuntime: CreateAgentSessionRuntimeFactory, options: {
    cwd: string;
    agentDir: string;
    sessionManager?: SessionManager;
    sessionStartEvent?: SessionStartEvent;
    model?: any;
    thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
    scopedModels?: Array<{
        model: any;
        thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
    }>;
    tools?: string[];
    noTools?: "all" | "builtin";
    customTools?: import("../agent/types.js").ToolDefinition[];
}): Promise<AgentSessionRuntime>;
//# sourceMappingURL=agent-session-runtime.d.ts.map