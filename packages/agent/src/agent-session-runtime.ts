// SPDX-License-Identifier: Apache-2.0
/**
 * AgentSessionRuntime - Runtime wrapper for AgentSession
 *
 * This is a stub implementation - full implementation coming in Phase A2
 */

import type { AgentSession } from "./agent-session.js";
import type { AgentSessionServices } from "./agent-session-services.js";
import type { SessionManager } from "./session-manager.js";

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
 * AgentSessionRuntime - Owns the current AgentSession plus its cwd-bound services
 */
export class AgentSessionRuntime {
  /**
   * Get the current session
   */
  get session(): AgentSession {
    throw new Error("Not implemented");
  }

  /**
   * Get the current services
   */
  get services(): AgentSessionServices {
    throw new Error("Not implemented");
  }

  /**
   * Get the current working directory
   */
  get cwd(): string {
    throw new Error("Not implemented");
  }

  /**
   * Get diagnostics collected during setup
   */
  get diagnostics(): readonly AgentSessionRuntimeDiagnostic[] {
    throw new Error("Not implemented");
  }

  /**
   * Get model fallback message if any
   */
  get modelFallbackMessage(): string | undefined {
    throw new Error("Not implemented");
  }

  /**
   * Switch to a different session
   */
  async switchSession(
    sessionPath: string,
    options?: { cwdOverride?: string }
  ): Promise<{ cancelled: boolean }> {
    throw new Error("Not implemented");
  }

  /**
   * Create a new session
   */
  async newSession(options?: {
    parentSession?: string;
    setup?: (sessionManager: SessionManager) => Promise<void>;
  }): Promise<{ cancelled: boolean }> {
    throw new Error("Not implemented");
  }

  /**
   * Fork the current session at a specific entry
   */
  async fork(
    entryId: string,
    options?: { position?: "before" | "at" }
  ): Promise<{ cancelled: boolean; selectedText?: string }> {
    throw new Error("Not implemented");
  }

  /**
   * Import a session from JSONL file
   */
  async importFromJsonl(
    inputPath: string,
    cwdOverride?: string
  ): Promise<{ cancelled: boolean }> {
    throw new Error("Not implemented");
  }

  /**
   * Dispose the runtime
   */
  async dispose(): Promise<void> {
    // Stub
  }
}

/**
 * Create initial runtime
 */
export async function createAgentSessionRuntime(
  createRuntime: CreateAgentSessionRuntimeFactory,
  options: {
    cwd: string;
    agentDir: string;
    sessionManager: SessionManager;
    sessionStartEvent?: SessionStartEvent;
  }
): Promise<AgentSessionRuntime> {
  throw new Error("Not implemented");
}