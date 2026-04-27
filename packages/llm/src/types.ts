/**
 * Minimal types
 */

export type StopReason = 'stop' | 'length' | 'toolUse' | 'error' | 'aborted';

export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
}

export interface TextContent { type: 'text'; text: string; }
export interface ImageContent { type: 'image'; data: string; mimeType: string; }
export interface ThinkingContent { type: 'thinking'; thinking: string; thinkingSignature?: string; }
export type MessageContent = TextContent | ImageContent | ThinkingContent;

export interface ToolCall {
  type: 'toolCall';
  id: string;
  name: string;
  arguments: Record<string, any>;
  partialArgs?: string;
  thoughtSignature?: string; // For encrypted reasoning
}

export interface UserMessage {
  role: 'user';
  content: string | MessageContent[];
  timestamp: number;
}

export interface AssistantMessage {
  role: 'assistant';
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: string;
  provider: string;
  model: string;
  usage: Usage;
  stopReason: StopReason;
  errorMessage?: string;
  timestamp: number;
  responseId?: string;
}

export interface ToolResultMessage {
  role: 'toolResult';
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  isError: boolean;
  timestamp: number;
}

export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export interface Context {
  systemPrompt?: string;
  messages: Message[];
  tools?: Tool[];
}

export interface Tool {
  name: string;
  description: string;
  parameters: any; // JSON Schema
}

export interface AssistantMessageEvent {
  type: 'start' | 'text_start' | 'text_delta' | 'text_end' |
        'thinking_start' | 'thinking_delta' | 'thinking_end' |
        'toolcall_start' | 'toolcall_delta' | 'toolcall_end' |
        'done' | 'error';
  contentIndex?: number;
  delta?: string;
  content?: string;
  partial?: any;
  toolCall?: ToolCall;
  reason?: StopReason;
  error?: AssistantMessage;
  message?: AssistantMessage; // for 'done'
}

export interface Model {
  id: string;
  name: string;
  api: string;
  provider: string;
  baseUrl: string;
  reasoning: boolean;
  input: ('text' | 'image')[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  contextWindow: number;
  maxTokens: number;
  compat?: Record<string, any>;
  headers?: Record<string, string>;
  releaseDate?: string;
}

export interface StreamOptions {
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  onPayload?: (payload: any, model: Model) => any | Promise<any | undefined>;
  headers?: Record<string, string>;
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}
