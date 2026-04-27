// SPDX-License-Identifier: Apache-2.0
/**
 * Extensions Index - Export all extension types and functions
 */

export type {
  Extension,
  ExtensionCommand,
  ExtensionAPI,
  ExtensionSession,
  ExtensionCommandContext,
  ExtensionCommandContextActions,
  ExtensionFactory,
  ExtensionContext,
  ExtensionHandler,
  ExtensionEvent,
  AgentStartEvent,
  AgentEndEvent,
  ToolCallEvent,
  ToolResultEvent,
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  SessionStartEvent,
  SessionShutdownEvent,
  SessionBeforeSwitchEvent,
  SessionBeforeForkEvent,
  SessionCompactEvent,
  InputEvent,
  InputEventResult,
  ModelSelectEvent,
  ExtensionUIDialogOptions,
  ExtensionWidgetOptions,
  WidgetPlacement,
  ExtensionShortcut,
  SourceInfo,
  LoadExtensionsResult,
  ExtensionRuntime,
} from "./types.js";

export type {
  isReadToolResult,
  isBashToolResult,
  isWriteToolResult,
  isEditToolResult,
  isGrepToolResult,
  isFindToolResult,
  isLsToolResult,
  isToolCallEventType,
} from "./types.js";