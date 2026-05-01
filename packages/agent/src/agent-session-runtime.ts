// SPDX-License-Identifier: Apache-2.0
/**
 * AgentSessionRuntime - Owns the current AgentSession plus its cwd-bound services
 *
 * This is the highest-level API for creating and managing agent sessions.
 * It serves as the composition root for the entire agent system.
 */

import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

import { AgentSession } from "./agent-session.js";
import type { AgentSessionServices } from "./agent-session-services.js";
import { createAgentSessionServices, createAgentSessionFromServices } from "./agent-session-services.js";
import { SessionManager } from "./session-manager.js";
import type { Model } from "@picro/llm";

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
export class AgentSessionRuntime implements AgentSessionRuntime {
  private _agent: any; // Agent - avoid circular import
  private _session: AgentSession;
  private _services: AgentSessionServices;
  private _cwd: string;
  private _disposed = false;

  constructor(
    agent: any,
    session: AgentSession,
    services: AgentSessionServices
  ) {
    this._agent = agent;
    this._session = session;
    this._services = services;
    this._cwd = services.cwd;
  }

  /**
   * Get the current session (for internal use only)
   */
  get session(): AgentSession {
    return this._session;
  }

  /**
   * Get the current services
   */
  get services(): AgentSessionServices {
    return this._services;
  }

  /**
   * Get the current working directory
   */
  get cwd(): string {
    return this._cwd;
  }

  /**
   * Get diagnostics collected during setup
   */
  get diagnostics(): readonly AgentSessionRuntimeDiagnostic[] {
    return this._services.diagnostics;
  }

  /**
   * Get model fallback message if any
   */
  get modelFallbackMessage(): string | undefined {
    return undefined;
  }

  /**
   * Switch to a different session file
   */
  async switchSession(
    sessionPath: string,
    options?: { cwdOverride?: string }
  ): Promise<{ cancelled: boolean }> {
    if (this._disposed) {
      return { cancelled: true };
    }

    try {
      const cwd = options?.cwdOverride ?? this._cwd;
      const newSessionManager = SessionManager.open(sessionPath, this._services.sessionDir, cwd);
      
      // Create new session with same agent and services
      this._session = await createAgentSessionFromServices({
        services: this._services,
        sessionManager: newSessionManager,
      });

      return { cancelled: false };
    } catch (error) {
      console.error("Failed to switch session:", error);
      return { cancelled: true };
    }
  }

  /**
   * Create a new session
   */
  async newSession(options?: {
    parentSession?: string;
    setup?: (sessionManager: SessionManager) => Promise<void>;
  }): Promise<{ cancelled: boolean }> {
    if (this._disposed) {
      return { cancelled: true };
    }

    try {
      const newSessionManager = SessionManager.continueRecent(this._cwd, this._services.sessionDir);
      newSessionManager.newSession({ parentSession: options?.parentSession });

      if (options?.setup) {
        await options.setup(newSessionManager);
      }

      // Create new session with same agent and services
      this._session = await createAgentSessionFromServices({
        services: this._services,
        sessionManager: newSessionManager,
      });

      return { cancelled: false };
    } catch (error) {
      console.error("Failed to create new session:", error);
      return { cancelled: true };
    }
  }

  /**
   * Fork the current session at a specific entry
   */
  async fork(
    entryId: string,
    options?: { position?: "before" | "at" }
  ): Promise<{ cancelled: boolean; selectedText?: string }> {
    if (this._disposed) {
      return { cancelled: true };
    }

    try {
      const position = options?.position ?? "at";
      const branchFromId = position === "before" 
        ? this._session.sessionManager.getEntry(entryId)?.parentId ?? null
        : entryId;

      // Create branch summary
      this._session.sessionManager.branchWithSummary(
        branchFromId,
        `Forked from entry ${entryId}`
      );

      // Session manager is already updated, no need to create new AgentSession
      return { cancelled: false };
    } catch (error) {
      console.error("Failed to fork session:", error);
      return { cancelled: true };
    }
  }

  /**
   * Import a session from JSONL file
   */
  async importFromJsonl(
    inputPath: string,
    cwdOverride?: string
  ): Promise<{ cancelled: boolean }> {
    if (this._disposed) {
      return { cancelled: true };
    }

    try {
      if (!existsSync(inputPath)) {
        console.error(`Session file not found: ${inputPath}`);
        return { cancelled: true };
      }

      const content = require('node:fs').readFileSync(inputPath, "utf-8");
      const cwd = cwdOverride ?? this._cwd;
      const sessionDir = this._services.sessionDir;

      const newSessionManager = SessionManager.importSession(
        cwd,
        sessionDir,
        content
      );

      // Create new session with same agent and services
      this._session = await createAgentSessionFromServices({
        services: this._services,
        sessionManager: newSessionManager,
      });

      return { cancelled: false };
    } catch (error) {
      console.error("Failed to import session:", error);
      return { cancelled: true };
    }
  }

  /**
   * Dispose the runtime
   */
  async dispose(): Promise<void> {
    if (this._disposed) return;

    this._session.dispose();
    this._disposed = true;
  }
}

/**
 * Create initial runtime
 *
 * This is the main entry point for creating an AgentSessionRuntime.
 * It sets up all services and creates the initial session.
 */
export async function createAgentSessionRuntime(
  createRuntime: CreateAgentSessionRuntimeFactory,
  options: {
    cwd: string;
    agentDir: string;
    sessionManager?: SessionManager;
    sessionStartEvent?: SessionStartEvent;
    model?: any;
    thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
    scopedModels?: Array<{ model: any; thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" }>;
    tools?: string[];
    noTools?: "all" | "builtin";
    customTools?: import("./types.js").ToolDefinition[];
  }
): Promise<AgentSessionRuntime> {
  const cwd = options.cwd;
  const agentDir = options.agentDir;

  // Ensure agent directory exists
  if (!existsSync(agentDir)) {
    mkdirSync(agentDir, { recursive: true });
  }

  // Create services
  const services = await createAgentSessionServices({
    cwd,
    agentDir,
  });

  // Get or create session manager
  let sessionManager: SessionManager;
  if (options.sessionManager) {
    sessionManager = options.sessionManager;
  } else {
    // Try to continue recent session, or create new
    sessionManager = SessionManager.continueRecent(cwd, services.sessionDir);
  }

  // Create session from services
  const session = await createAgentSessionFromServices({
    services,
    sessionManager,
    sessionStartEvent: options.sessionStartEvent,
    model: options.model,
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