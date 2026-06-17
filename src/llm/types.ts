/**
 * Minimal types
 *
 * KnownProvider: Danh sách providers được hỗ trợ (có thể mở rộng sau)
 *
 * Hiện tại chỉ support OpenAI-compatible providers với API types:
 * - openai-completions
 * - openai-responses (openai-codex)
 */

export type KnownApi =
  | "openai-completions"
  | "openai-codex-responses"
  | (string & {});

export type Api = KnownApi | (string & {});

/**
 * Core OpenAI-compatible providers (chỉ 4 hiện tại)
 *
 * Mở rộng sau: thêm vào union type
 */
// All providers from models.generated.js
// Using string to accommodate all generated providers without exhaustive list
export type KnownProvider =
  | "amazon-bedrock"
  | "ant-ling"
  | "anthropic"
  | "google"
  | "google-vertex"
  | "openai"
  | "azure-openai-responses"
  | "openai-codex"
  | "nvidia"
  | "deepseek"
  | "github-copilot"
  | "xai"
  | "groq"
  | "cerebras"
  | "openrouter"
  | "vercel-ai-gateway"
  | "zai"
  | "zai-coding-cn"
  | "mistral"
  | "minimax"
  | "minimax-cn"
  | "moonshotai"
  | "moonshotai-cn"
  | "huggingface"
  | "fireworks"
  | "together"
  | "opencode"
  | "opencode-go"
  | "kimi-coding"
  | "cloudflare-workers-ai"
  | "cloudflare-ai-gateway"
  | "xiaomi"
  | "xiaomi-token-plan-cn"
  | "xiaomi-token-plan-ams"
  | "xiaomi-token-plan-sgp"
  | "kilo"
  | "302ai";


export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
export type ModelThinkingLevel = 'off' | ThinkingLevel;
export type ThinkingLevelMap = Partial<Record<ModelThinkingLevel, number | null>>;

export interface ThinkingBudgets {
  minimal?: number;
  low?: number;
  medium?: number;
  high?: number;
}

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
  api: Api;
  provider: KnownProvider;
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

export interface Model<TApi extends Api = Api> {
  id: string;
  name: string;
  api: TApi;
  provider: KnownProvider;
  baseUrl: string;
  reasoning: boolean;
  input: ('text' | 'image')[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  contextWindow: number;
  maxTokens: number;
  compat?: Record<string, any>;
  headers?: Record<string, string>;
  releaseDate?: string;
  thinkingLevelMap?: Record<string, any>;
  [key: string]: any; // Allow other generated fields
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
