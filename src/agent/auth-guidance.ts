// SPDX-License-Identifier: Apache-2.0
/**
 * Auth Guidance - Messages for auth guidance
 */

/**
 * Format "no API key found" message
 */
export function formatNoApiKeyFoundMessage(provider: string): string {
  return `No API key found for ${provider}.
    
To set up authentication:
1. Run: pi login ${provider}
2. Or set the API key directly in ~/.pi/agent/auth.json

For more help, visit: https://pi.dev/docs/auth`;
}

/**
 * Format "no model selected" message
 */
export function formatNoModelSelectedMessage(): string {
  return `No model selected.
    
To select a model:
1. Run: pi --model <provider>/<model>
2. Or set default in settings: pi config set defaultProvider <provider>
3. Then: pi config set defaultModel <model>

List available models: pi --list-models`;
}

/**
 * Format "no models available" message
 */
export function formatNoModelsAvailableMessage(): string {
  return `No models available.
    
To use pi, you need to:
1. Add a model: pi login <provider>
2. Or manually configure in ~/.pi/agent/models.json

List available providers: pi --list-models`;
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