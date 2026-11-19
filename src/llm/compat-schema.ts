/**
 * Compatibility Schema
 * 
 * Schema definitions for provider-specific compatibility settings.
 * Reference: pi-ai providers/compat-schema.ts
 * Self-implemented, no code copying.
 */

import type { OpenRouterRouting, ThinkingBudgetField, SessionAffinityFormat, ChatTemplateThinkingKwarg } from './types.js';

export type { ThinkingBudgetField, SessionAffinityFormat, ChatTemplateThinkingKwarg, OpenRouterRouting } from './types.js';

/**
 * Get the thinking budget field name for a model
 */
export function getThinkingBudgetField(model: { thinkingBudgetField?: ThinkingBudgetField }): ThinkingBudgetField {
  const field = model.thinkingBudgetField;
  if (field === "thinking_token_budget" || field === "thinking_budget" || field === "thinking_budget_tokens") {
    return field;
  }
  return "thinking_budget_tokens";
}

/**
 * Get the session affinity format for a model
 */
export function getSessionAffinityFormat(model: { sessionAffinityFormat?: SessionAffinityFormat }): SessionAffinityFormat {
  const format = model.sessionAffinityFormat;
  if (format === "openai" || format === "openai-nosession" || format === "openrouter") {
    return format;
  }
  return "openai";
}

/**
 * Map reasoning effort to token budget
 */
export function mapEffortToTokens(effort: "minimal" | "low" | "medium" | "high" | "xhigh"): number {
  const effortMap: Record<string, number> = {
    minimal: 1024,
    low: 2048,
    medium: 4096,
    high: 8192,
    xhigh: 16384,
  };
  return effortMap[effort] ?? 4096;
}

/**
 * Get chat template thinking kwargs for a model
 */
export function getChatTemplateThinkingKwargs(model: { chatTemplateThinking?: ChatTemplateThinkingKwarg }): ChatTemplateThinkingKwarg | undefined {
  return model.chatTemplateThinking;
}

/**
 * Get OpenRouter routing config for a model
 */
export function getOpenRouterRouting(model: { openRouterRouting?: OpenRouterRouting }): Record<string, unknown> | undefined {
  return model.openRouterRouting as Record<string, unknown> | undefined;
}