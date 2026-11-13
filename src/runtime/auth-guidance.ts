// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * Auth Guidance - Messages for auth guidance
 * Moved from agent/ to runtime/ because it's UI/runtime specific.
 *
 * Tên lệnh trong hướng dẫn là TÊN APP THẬT (`picro`), không phải tên của bản
 * tham chiếu: người dùng gõ "pi --model ..." sẽ không có lệnh đó.
 */

import { APP_NAME } from "../config.js";

/** Tên lệnh người dùng phải gõ (picro, không phải tên bản tham chiếu). */
const CLI = APP_NAME || "picro";

/**
 * Format "no API key found" message
 */
export function formatNoApiKeyFoundMessage(provider: string): string {
  return `No API key found for ${provider}.
    
To set up authentication:
1. Run: ${CLI} login ${provider}
2. Or set the API key directly in ~/.pi/agent/auth.json

For more help, visit the picro docs`;
}

/**
 * Format "no model selected" message
 */
export function formatNoModelSelectedMessage(): string {
  return `No model selected.
    
To select a model:
1. Run: ${CLI} --model <provider>/<model>
2. Or set default in settings: ${CLI} --provider <provider>
3. Then: ${CLI} --model <model>

List available models: ${CLI} --list-models`;
}

/**
 * Format "no models available" message
 */
export function formatNoModelsAvailableMessage(): string {
  return `No models available.
    
To use picro, you need to:
1. Add a model: ${CLI} login <provider>
2. Or manually configure in ~/.pi/agent/models.json

List available providers: ${CLI} --list-models`;
}

/**
 * Format login instructions
 */
export function formatLoginInstructions(provider: string): string {
  const providerInstructions: Record<string, string> = {
    anthropic: "Set ANTHROPIC_API_KEY environment variable or run 'pi login anthropic'",
    openai: "Set OPENAI_API_KEY environment variable or run 'pi login openai'",
    google: "Set GOOGLE_API_KEY environment variable or run 'pi login google'",
    openrouter: "Set OPENROUTER_API_KEY environment variable or run 'pi login openrouter'",
  };

  return providerInstructions[provider] ?? `Set API key for ${provider} in auth.json or environment variable`;
}
