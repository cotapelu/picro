// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/llm - OpenAI-Compatible LLM Extension
 * 
 * Export all types and functions needed by agent package
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Models and lookup functions
export { MODELS, getModel, getProviders, getModels } from './models.js';

// Re-export from types
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
  MessageContent,
  ToolCall,
  StopReason, 
  Usage, 
  StreamOptions,
  AssistantMessageEvent
} from './types.js';

// Provider APIs  
export { stream, complete } from './providers/openai-compatible.js';

// Stream optimization
export { StreamBuffer, getProviderBufferConfig, createStreamBuffer, providerBufferConfigs } from './utils/stream-buffer.js';
export type { BufferConfig } from './utils/stream-buffer.js';

// Api type - simple alias for provider API object
export type Api = "openai" | "anthropic" | "google" | "custom";

// Simple model lookup - returns Model from MODELS
export function getModelById(modelId: string): any {
  return getModel("any", modelId);
}

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
  getModelById,
};