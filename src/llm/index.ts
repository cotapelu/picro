// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/llm - OpenAI-Compatible LLM Extension
 * 
 * Export all types and functions needed by agent package
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Models and lookup functions
export { MODELS, getModel, getProviders, getModels } from './models';

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
} from './types';

// Provider APIs  
export { stream, complete } from './providers/openai-compatible';

// Stream optimization
export { StreamBuffer, getProviderBufferConfig, createStreamBuffer, providerBufferConfigs } from './utils/stream-buffer';
export type { BufferConfig } from './utils/stream-buffer';

// Api type - simple alias for provider API object
export type Api = "openai" | "anthropic" | "google" | "custom";

// Simple model lookup - returns Model from MODELS
export function getModelById(modelId: string): any {
  return getModel("any", modelId);
}

// Default export
import { MODELS, getModel, getProviders, getModels } from './models';
import { stream, complete } from './providers/openai-compatible';

export default {
  MODELS,
  getModel,
  getProviders,
  getModels,
  stream,
  complete,
  getModelById,
};