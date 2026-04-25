/**
 * @picro/llm - OpenAI-Compatible LLM Extension
 *
 * Provides access to 800+ models across 23 providers including NVIDIA NIM,
 * OpenRouter, Anthropic, Google, OpenAI, Groq, Cerebras, xAI, Mistral, HuggingFace, and more.
 *
 * @packageDocumentation
 */

// Models and lookup functions (matches pi-ai pattern)
export { MODELS, getModel, getProviders, getModels } from './models.js';

// Type exports
export type {
  Model,
  Context,
  Message,
  UserMessage,
  AssistantMessage,
  ToolResultMessage,
  Tool,
  TextContent,
  ImageContent,
  ThinkingContent,
  StopReason,
  Usage,
  StreamOptions,
} from './types.js';

// Provider APIs
export { stream, complete } from './providers/openai-compatible.js';

// Stream optimization
export { StreamBuffer, getProviderBufferConfig, createStreamBuffer, providerBufferConfigs } from './utils/stream-buffer.js';
export type { BufferConfig } from './utils/stream-buffer.js';

// Default export
import { MODELS, getModel, getProviders, getModels } from './models.js';
import { stream, complete } from './providers/openai-compatible.js';

export default {
  MODELS,
  getModel,
  getProviders,
  getModels,
  stream,
  complete,
};
