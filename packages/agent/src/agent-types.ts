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
