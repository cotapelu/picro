// SPDX-License-Identifier: Apache-2.0
/**
 * Agent Types - Extended types for agent module
 */

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

export interface ThinkingContent {
  type: "thinking";
  thinking: string;
}

export interface ToolCallContent {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultContent {
  type: "toolResult";
  toolCallId: string;
  toolName: string;
  content: TextContent[];
}

export type ContentBlock = TextContent | ImageContent | ThinkingContent | ToolCallContent | ToolResultContent;

export interface BaseMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentBlock[];
  timestamp?: number;
}

export interface SystemMessage extends BaseMessage {
  role: "system";
}

export interface UserMessage extends BaseMessage {
  role: "user";
}

export interface AssistantMessage extends BaseMessage {
  role: "assistant";
  content: ContentBlock[];
  stopReason?: string;
  usage?: {
    input: number;
    output: number;
    totalTokens: number;
    cost: { input: number; output: number; total: number };
  };
  provider?: string;
  model?: string;
}

export interface ToolMessage extends BaseMessage {
  role: "tool";
  toolCallId: string;
  toolName: string;
  content: TextContent[];
  isError?: boolean;
}

export type AgentMessage = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

// ============================================================================
// Agent Types
// ============================================================================

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface AgentState {
  systemPrompt: string;
  model?: any;
  thinkingLevel: ThinkingLevel;
  messages: AgentMessage[];
  tools: AgentTool[];
  isStreaming: boolean;
  isRunning: boolean;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  handler: ToolHandler;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext,
  onProgress?: (update: ToolProgressUpdate) => void | Promise<void>
) => string | Promise<string> | void | Promise<void>;

export interface ToolContext {
  round: number;
  runtimeState: AgentRuntimeState;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface ToolProgressUpdate {
  partialResult?: string;
  details?: Record<string, unknown>;
}

export interface AgentRuntimeState {
  messages: AgentMessage[];
  tools: AgentTool[];
  isRunning: boolean;
  isStreaming: boolean;
  history: AgentMessage[];
}

// Re-export from types
export type { QueueMode } from './types';
export type { AgentEvent } from './types';
export type { Agent } from './agent';
