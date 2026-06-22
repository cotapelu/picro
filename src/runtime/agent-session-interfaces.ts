// SPDX-License-Identifier: Apache-2.0
/**
 * Shared types for agent session interface
 * Used by both agent runtime and TUI components
 */

import type { SessionTreeNode } from "../session/session-manager.js";
import type { SessionStats } from "../session/agent-session-types.js";

/**
 * Agent session interface - full interface for UI to interact with session
 */
export interface AgentSessionInterface {
  prompt(text: string, options?: { images?: unknown[] }): Promise<void>;
  subscribe(listener: (event: AgentSessionRuntimeEvent) => void): () => void;
  abort(): void;
  messages: unknown[];
  isStreaming: boolean;
  // Thinking level
  get thinkingLevel(): "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  setThinkingLevel(level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh"): void;
  // Performance metrics (if enabled)
  getPerformanceStats?(): { sampleCount: number; timeSpanMS: number; avgCpuUserMS: number; avgCpuSystemMS: number; avgRSSMB: number; avgHeapUsedMB: number; peakRSSMB: number; peakHeapUsedMB: number } | null;

  // Queue management
  getSteeringMessages(): readonly string[];
  getFollowUpMessages(): readonly string[];
  clearQueue(): { steering: string[]; followUp: string[] };

  // Tool definitions
  getToolDefinition(name: string): any;

  // Model handling
  cycleModel(direction?: "next" | "prev"): { model: any; thinkingLevel?: string } | undefined;
  setModel(model: any): Promise<void>;
  setAutoCompactionEnabled(enabled: boolean): void;
  getContextUsage(): { tokens: number; contextWindow: number; percent: number } | undefined;

  // Tree navigation and session branching
  getTree(): SessionTreeNode[];
  getLeafId(): string | null;
  navigateTree(branchId: string, options?: { summarize?: boolean; customInstructions?: string }): Promise<{ cancelled: boolean; selectedText?: string }>;

  // Session stats and forking
  getSessionStats(): SessionStats;
  getUserMessagesForForking(): Array<{ entryId: string; text: string }>;
  getLastAssistantText(): string | undefined;

  // Compaction
  compact(customInstructions?: { customInstructions?: string }): Promise<void>;
  abortCompaction(): void;

  // Retry
  abortRetry(): void;

  // Bash execution
  recordBashResult(command: string, output: string, exitCode: number, cancelled: boolean, truncated: boolean, fullOutputPath?: string, options?: { excludeFromContext?: boolean }): void;
  abortBash(): void;

  // Session name (via session manager)
  sessionManager: {
    getSessionName(): string | undefined;
    getEntries(): any[];
    getCwd(): string;
    setSessionName(name: string): void;
  };

  // Reload resources
  reload?(): Promise<void>;

  // Extension runner reference (for binding extensions)
  _extensionRunner?: any;
}

/**
 * Agent session runtime interface for UI
 */
export interface AgentSessionRuntimeInterface {
  session: AgentSessionInterface;
  cwd: string;
  // Prompting (high-level API)
  prompt(text: string, options?: { images?: unknown[] }): Promise<void>;
  // Session management
  newSession(): Promise<{ cancelled: boolean }>;
  switchSession(path: string): Promise<{ cancelled: boolean }>;
  fork(entryId: string): Promise<{ cancelled: boolean; selectedText?: string }>;
  listSessions(): Promise<Array<{ id: string; path: string; cwd: string; modified?: Date; name?: string; firstMessage?: string }>>;
  setBeforeSessionInvalidate(handler: () => void): void;
  setRebindSession(handler: (sessionPath?: string) => Promise<void>): void;
  // Settings access
  get settings(): any;
  // Thinking level (delegated to session)
  get thinkingLevel(): "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  setThinkingLevel(level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh"): void;
  // Auth
  get authStorage(): { getProviders(): any[]; setApiKey(provider: string, apiKey: string): Promise<void>; removeApiKey(provider: string): Promise<void>; };
  // Clipboard (optional, may use system)
  copyToClipboard(text: string): Promise<void>;
}

/**
 * Agent session event types (subset for UI handling)
 */
export type AgentSessionRuntimeEvent = 
  // Agent lifecycle
  | { type: 'agent_start' }
  | { type: 'agent_end' }
  // Messages
  | { type: 'message_start'; message: { role: string; id?: string } }
  | { type: 'message_update'; message: { role: string; content?: unknown[] } }
  | { type: 'message_end'; message: { role: string; stopReason?: string } }
  // Tool execution
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool_execution_update'; toolCallId: string; partialResult?: unknown }
  | { type: 'tool_execution_end'; toolCallId: string; result: unknown; isError?: boolean }
  // Queue
  | { type: 'queue_update'; steering: readonly string[]; followUp: readonly string[] }
  // Compaction
  | { type: 'compaction_start'; reason?: 'manual' | 'auto' | 'overflow' }
  | { type: 'compaction_end'; reason?: 'manual' | 'auto' | 'overflow'; aborted?: boolean; willRetry?: boolean; errorMessage?: string; summary?: string; tokensBefore?: number }
  // Retry
  | { type: 'auto_retry_start'; attempt: number; delayMs?: number }
  | { type: 'auto_retry_end'; success: boolean }
  // Model change
  | { type: 'model_change'; model: any }
  // Session tree update
  | { type: 'session_tree' }
  // Session info changed
  | { type: 'session_info_changed' }
  // Errors
  | { type: 'error'; error: string };