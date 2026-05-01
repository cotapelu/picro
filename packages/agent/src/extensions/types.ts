// SPDX-License-Identifier: Apache-2.0
/**
 * Extensions Types - Type definitions for the extension system
 *
 * Extensions allow adding custom tools, commands, and event handlers to pi.
 */

import type { AgentTool } from "../agent-types.js";
import type { ToolDefinition } from "../types.js";

// ============================================================================
// Extension Types
// ============================================================================

/**
 * Extension metadata
 */
export interface Extension {
  /** Unique name */
  name: string;
  
  /** Path to extension */
  path: string;
  
  /** Extension version */
  version?: string;
  
  /** Registered tools */
  tools: Map<string, AgentTool>;
  
  /** Registered commands */
  commands: Map<string, ExtensionCommand>;
  
  /** Extension flags */
  flags: Map<string, { type: "boolean" | "string"; description?: string }>;
  
  /** Source info */
  sourceInfo?: SourceInfo;
}

/**
 * Extension command
 */
export interface ExtensionCommand {
  /** Command name (without slash) */
  name: string;
  
  /** Command description */
  description: string;
  
  /** Handler function */
  handler: (args: string, context: ExtensionCommandContext) => Promise<void> | void;
  
  /** Source info */
  sourceInfo?: SourceInfo;
}

/**
 * Extension API - available to extension handlers
 */
export interface ExtensionAPI {
  /** Send a message to the user */
  sendMessage: (content: string) => void;
  
  /** Send a custom message */
  sendCustomMessage: (type: string, content: any) => void;
  
  /** Get current session */
  getSession: () => ExtensionSession;
  
  /** Register a tool */
  registerTool: (tool: ToolDefinition) => void;
  
  /** Unregister a tool */
  unregisterTool: (name: string) => void;
  
  /** Get all registered tools */
  getTools: () => ToolDefinition[];
  
  /** Set active tools */
  setActiveTools: (names: string[]) => void;
  
  /** Get current model */
  getModel: () => any;
  
  /** Set model */
  setModel: (model: any) => Promise<void>;
  
  /** Get thinking level */
  getThinkingLevel: () => string;
  
  /** Set thinking level */
  setThinkingLevel: (level: string) => void;
  
  /** Register a command */
  registerCommand: (command: ExtensionCommand) => void;
  
  /** Get all commands */
  getCommands: () => ExtensionCommand[];
  
  /** Show a dialog */
  showDialog: (options: ExtensionUIDialogOptions) => Promise<void>;
  
  /** Show a widget */
  showWidget: (options: ExtensionWidgetOptions) => Promise<void>;
  
  /** Get extension config */
  getConfig: <T = any>(key: string, defaultValue?: T) => T;
  
  /** Set extension config */
  setConfig: <T = any>(key: string, value: T) => void;
  
  /** Get flag value */
  getFlag: (name: string) => string | boolean | undefined;
  
  /** Register a keybinding */
  registerKeybinding: (binding: ExtensionShortcut) => void;
}

/**
 * Extension session context
 */
export interface ExtensionSession {
  /** Session ID */
  id: string;
  
  /** Current working directory */
  cwd: string;
  
  /** Session file path */
  sessionFile?: string;
  
  /** Get messages */
  getMessages: () => any[];
  
  /** Get tool results */
  getToolResults: () => any[];
  
  /** Continue the agent */
  continue: () => Promise<void>;
  
  /** Fork session at current point */
  fork: (label?: string) => Promise<string>;
  
  /** Switch to a different session */
  switchSession: (sessionPath: string) => Promise<void>;
  
  /** Create new session */
  newSession: (options?: { parentSession?: string }) => Promise<void>;
  
  /** Get resource loader */
  getResourceLoader: () => any;
}

/**
 * Extension command context
 */
export interface ExtensionCommandContext {
  /** The session */
  session: ExtensionSession;
  
  /** Actions available */
  actions: ExtensionCommandContextActions;
  
  /** Source of the command */
  source: "cli" | "ui" | "extension";
}

/**
 * Actions available in command context
 */
export interface ExtensionCommandContextActions {
  /** Continue agent with response */
  continueWith: (response: string) => Promise<void>;
  
  /** Continue with tool results */
  continueWithToolResults: (results: any[]) => Promise<void>;
  
  /** Send a message */
  sendMessage: (content: string) => void;
  
  /** Show a notification */
  notify: (message: string, type?: "info" | "warning" | "error") => void;
  
  /** Cancel the command */
  cancel: () => void;
}

/**
 * Extension factory - creates an extension
 */
export type ExtensionFactory = (context: ExtensionContext) => Promise<Extension> | Extension;

/**
 * Extension context - provided to factory
 */
export interface ExtensionContext {
  /** Extension directory */
  extensionDir: string;
  
  /** Working directory */
  cwd: string;
  
  /** Extension API */
  api: ExtensionAPI;
  
  /** Logger */
  log: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}

/**
 * Extension handler
 */
export type ExtensionHandler = (context: ExtensionContext) => void | Promise<void>;

// ============================================================================
// Event Types
// ============================================================================

/**
 * Base extension event
 */
export interface ExtensionEvent {
  type: string;
  [key: string]: any;
}

/**
 * Agent start event
 */
export interface AgentStartEvent extends ExtensionEvent {
  type: "agent_start";
  prompt: string;
  model: any;
}

/**
 * Agent end event
 */
export interface AgentEndEvent extends ExtensionEvent {
  type: "agent_end";
  messages: any[];
  success: boolean;
}

/**
 * Tool call event
 */
export interface ToolCallEvent extends ExtensionEvent {
  type: "tool_call";
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
}

/**
 * Tool result event
 */
export interface ToolResultEvent extends ExtensionEvent {
  type: "tool_result";
  toolName: string;
  toolCallId: string;
  result: string;
  isError: boolean;
}

/**
 * Before agent start event
 */
export interface BeforeAgentStartEvent extends ExtensionEvent {
  type: "before_agent_start";
  prompt: string;
  images?: any[];
}

/**
 * Result from before_agent_start handler
 */
export interface BeforeAgentStartEventResult {
  /** Modified prompt */
  prompt?: string;
  
  /** Additional messages to include */
  messages?: any[];
  
  /** Modified system prompt */
  systemPrompt?: string;
  
  /** Cancel the run */
  cancel?: boolean;
}

/**
 * Session events
 */
export interface SessionStartEvent extends ExtensionEvent {
  type: "session_start";
  reason: "startup" | "new" | "resume" | "fork";
  previousSessionFile?: string;
}

export interface SessionShutdownEvent extends ExtensionEvent {
  type: "session_shutdown";
  reason: "quit" | "new" | "resume" | "fork";
  targetSessionFile?: string;
}

export interface SessionBeforeSwitchEvent extends ExtensionEvent {
  type: "session_before_switch";
  reason: "new" | "resume";
  targetSessionFile?: string;
}

export interface SessionBeforeForkEvent extends ExtensionEvent {
  type: "session_before_fork";
  entryId: string;
  position: "before" | "at";
}

export interface SessionCompactEvent extends ExtensionEvent {
  type: "session_compact";
  reason: "manual" | "threshold" | "overflow";
  result: any;
}

/**
 * Input event
 */
export interface InputEvent extends ExtensionEvent {
  type: "input";
  text: string;
  images?: any[];
  source: "interactive" | "cli" | "extension" | "rpc";
}

/**
 * Input event result
 */
export interface InputEventResult {
  action: "pass" | "handled" | "transform";
  text?: string;
  images?: any[];
}

/**
 * Model select event
 */
export interface ModelSelectEvent extends ExtensionEvent {
  type: "model_select";
  model: any;
  previousModel?: any;
  source: "set" | "cycle" | "restore";
}

// ============================================================================
// UI Types
// ============================================================================

/**
 * Extension UI dialog options
 */
export interface ExtensionUIDialogOptions {
  title: string;
  message: string;
  type?: "info" | "warning" | "error";
  buttons?: string[];
}

/**
 * Extension widget options
 */
export interface ExtensionWidgetOptions {
  id: string;
  title?: string;
  content: string;
  placement?: "left" | "right" | "bottom";
}

/**
 * Widget placement
 */
export type WidgetPlacement = "left" | "right" | "bottom";

/**
 * Extension shortcut
 */
export interface ExtensionShortcut {
  /** Key combination */
  keys: string[];
  
  /** Description */
  description: string;
  
  /** Handler */
  handler: () => void | Promise<void>;
}

/**
 * Tool info for UI
 */
export interface ToolInfo {
  name: string;
  description: string;
  parameters: any;
}

/**
 * Registered tool with metadata
 */
export interface RegisteredTool {
  definition: ToolDefinition;
  sourceInfo?: SourceInfo;
}

/**
 * Autocomplete provider factory
 */
export type AutocompleteProviderFactory = (context: {
  sessionId: string;
  cwd: string;
  filter: string;
}) => Promise<Array<{
  label: string;
  description?: string;
  detail?: string;
  kind: "command" | "tool" | "file" | "flag" | "model";
  insertText?: string;
}>>;

/**
 * Message render result
 */
export interface MessageRenderResult {
  content?: string;
  attachments?: any[];
}

/**
 * Tool render result
 */
export interface ToolRenderResult {
  title?: string;
  content?: string;
  attachments?: any[];
}

/**
 * Tool render result options
 */
export interface ToolRenderResultOptions {
  width?: number;
  height?: number;
  showOutput?: boolean;
  truncateOutput?: boolean;
}

/**
 * Message renderer function
 */
export type MessageRenderer = (message: any, options?: any) => Promise<MessageRenderResult | null>;

/**
 * Working indicator options
 */
export interface WorkingIndicatorOptions {
  message?: string;
  showSpinner?: boolean;
  interval?: number;
}

// ============================================================================
// Source Info
// ============================================================================

/**
 * Source information for resources
 */
export interface SourceInfo {
  path: string;
  source: "local" | "builtin" | "extension" | "temporary";
  scope: "user" | "project" | "temporary";
  origin: "top-level" | "package";
  baseDir?: string;
}

// ============================================================================
// Load Result
// ============================================================================

/**
 * Result from loading extensions
 */
export interface LoadExtensionsResult {
  extensions: Extension[];
  errors: Array<{ path: string; error: string }>;
  runtime: ExtensionRuntime;
}

/**
 * Extension runtime
 */
export interface ExtensionRuntime {
  /** Flag values set by extensions */
  flagValues: Map<string, boolean | string>;
  
  /** Pending provider registrations */
  pendingProviderRegistrations: Array<{
    name: string;
    config: any;
    extensionPath: string;
  }>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if tool result is from read tool
 */
export function isReadToolResult(result: unknown): boolean {
  return typeof result === "string" && result.length > 0;
}

/**
 * Check if tool result is from bash tool
 */
export function isBashToolResult(result: unknown): boolean {
  return typeof result === "string" && result.length > 0;
}

/**
 * Check if tool result is from write tool
 */
export function isWriteToolResult(result: unknown): boolean {
  return typeof result === "string" && (result.includes("Written to") || result.includes("Created"));
}

/**
 * Check if tool result is from edit tool
 */
export function isEditToolResult(result: unknown): boolean {
  return typeof result === "string" && result.includes("Edit");
}

/**
 * Check if tool result is from grep tool
 */
export function isGrepToolResult(result: unknown): boolean {
  return typeof result === "string" && (result.includes("matches") || result.includes("Found"));
}

/**
 * Check if tool result is from find tool
 */
export function isFindToolResult(result: unknown): boolean {
  return typeof result === "string" && (result.includes("files") || result.includes("Found"));
}

/**
 * Check if tool result is from ls tool
 */
export function isLsToolResult(result: unknown): boolean {
  return typeof result === "string" && (result.includes("total") || result.startsWith("/"));
}

/**
 * Check if event is a tool call event type
 */
export function isToolCallEventType(event: ExtensionEvent): boolean {
  return [
    "tool_call",
    "tool_result",
    "tool_execution_start",
    "tool_execution_end",
  ].includes(event.type);
}