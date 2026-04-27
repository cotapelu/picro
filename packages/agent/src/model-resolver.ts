// SPDX-License-Identifier: Apache-2.0
/**
 * Model Resolver - Resolve model patterns to actual Model objects
 * 
 * Simple implementation using ModelEntry from model-registry
 */

import { type ModelRegistry, type ModelEntry } from "./model-registry.js";

// ============================================================================
// Constants
// ============================================================================

/** Default model IDs for each known provider */
export const defaultModelPerProvider: Record<string, string> = {
  anthropic: "claude-opus-4-7",
  openai: "gpt-5.4",
  google: "gemini-3.1-pro-preview",
  openrouter: "moonshotai/kimi-k2.6",
  xai: "grok-4.20-0309-reasoning",
  groq: "openai/gpt-oss-120b",
  cerebras: "zai-glm-4.7",
  zai: "glm-5.1",
  mistral: "devstral-medium-latest",
  minimax: "MiniMax-M2.7",
};

// ============================================================================
// Types
// ============================================================================

export interface ScopedModel {
  model: ModelEntry;
  thinkingLevel?: string;
}

export interface ParsedModelResult {
  model: ModelEntry | undefined;
  thinkingLevel?: string;
  warning: string | undefined;
}

export interface ResolveCliModelResult {
  model: ModelEntry | undefined;
  thinkingLevel?: string;
  warning: string | undefined;
  error: string | undefined;
}

export interface InitialModelResult {
  model: ModelEntry | undefined;
  thinkingLevel: string;
  fallbackMessage: string | undefined;
}

// ============================================================================
// Helper Functions
// ============================================================================

function isAlias(id: string): boolean {
  if (id.endsWith("-latest")) return true;
  const datePattern = /-\d{8}$/;
  return !datePattern.test(id);
}

function findExactModelReferenceMatch(
  modelReference: string,
  availableModels: ModelEntry[]
): ModelEntry | undefined {
  const trimmedReference = modelReference.trim().toLowerCase();
  if (!trimmedReference) return undefined;

  const canonicalMatches = availableModels.filter(
    (m) => `${m.provider}/${m.id}`.toLowerCase() === trimmedReference
  );
  if (canonicalMatches.length === 1) return canonicalMatches[0];

  const slashIndex = trimmedReference.indexOf("/");
  if (slashIndex !== -1) {
    const provider = trimmedReference.substring(0, slashIndex);
    const modelId = trimmedReference.substring(slashIndex + 1);
    const matches = availableModels.filter(
      (m) => m.provider.toLowerCase() === provider && m.id.toLowerCase() === modelId
    );
    if (matches.length === 1) return matches[0];
  }

  const idMatches = availableModels.filter((m) => m.id.toLowerCase() === trimmedReference);
  return idMatches.length === 1 ? idMatches[0] : undefined;
}

function tryMatchModel(pattern: string, availableModels: ModelEntry[]): ModelEntry | undefined {
  const exactMatch = findExactModelReferenceMatch(pattern, availableModels);
  if (exactMatch) return exactMatch;

  const lower = pattern.toLowerCase();
  const matches = availableModels.filter(
    (m) => m.id.toLowerCase().includes(lower) || m.name?.toLowerCase().includes(lower)
  );

  if (matches.length === 0) return undefined;

  const aliases = matches.filter((m) => isAlias(m.id));
  const datedVersions = matches.filter((m) => !isAlias(m.id));

  if (aliases.length > 0) {
    aliases.sort((a, b) => b.id.localeCompare(a.id));
    return aliases[0];
  } else {
    datedVersions.sort((a, b) => b.id.localeCompare(a.id));
    return datedVersions[0];
  }
}

const thinkingLevels = ["off", "low", "medium", "high", "auto"];

function isValidThinkingLevel(level: string): boolean {
  return thinkingLevels.includes(level);
}

export function parseModelPattern(
  pattern: string,
  availableModels: ModelEntry[],
  options?: { allowInvalidThinkingLevelFallback?: boolean }
): ParsedModelResult {
  const exactMatch = tryMatchModel(pattern, availableModels);
  if (exactMatch) {
    return { model: exactMatch, thinkingLevel: undefined, warning: undefined };
  }

  const lastColonIndex = pattern.lastIndexOf(":");
  if (lastColonIndex === -1) {
    return { model: undefined, thinkingLevel: undefined, warning: undefined };
  }

  const prefix = pattern.substring(0, lastColonIndex);
  const suffix = pattern.substring(lastColonIndex + 1);

  if (isValidThinkingLevel(suffix)) {
    const result = parseModelPattern(prefix, availableModels, options);
    if (result.model) {
      return {
        model: result.model,
        thinkingLevel: result.warning ? undefined : suffix,
        warning: result.warning,
      };
    }
    return result;
  } else {
    const allowFallback = options?.allowInvalidThinkingLevelFallback ?? true;
    if (!allowFallback) {
      return { model: undefined, thinkingLevel: undefined, warning: undefined };
    }

    const result = parseModelPattern(prefix, availableModels, options);
    if (result.model) {
      return {
        model: result.model,
        thinkingLevel: undefined,
        warning: `Invalid thinking level "${suffix}" in pattern "${pattern}". Using default.`,
      };
    }
    return result;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Resolve model patterns to actual Model objects
 */
export async function resolveModelScope(
  patterns: string[],
  modelRegistry: ModelRegistry
): Promise<ScopedModel[]> {
  const availableModels = await modelRegistry.getAvailable();
  const scopedModels: ScopedModel[] = [];

  for (const pattern of patterns) {
    let searchPattern = pattern;
    let thinkingLevel: string | undefined;

    const colonIdx = pattern.lastIndexOf(":");
    if (colonIdx !== -1) {
      const suffix = pattern.substring(colonIdx + 1);
      if (isValidThinkingLevel(suffix)) {
        thinkingLevel = suffix;
        searchPattern = pattern.substring(0, colonIdx);
      }
    }

    if (searchPattern.includes("*") || searchPattern.includes("?")) {
      const lower = searchPattern.toLowerCase();
      const matches = availableModels.filter((m) => {
        const fullId = `${m.provider}/${m.id}`.toLowerCase();
        return matchGlob(fullId, lower) || matchGlob(m.id.toLowerCase(), lower);
      });

      if (matches.length === 0) {
        console.warn(`Warning: No models match pattern "${pattern}"`);
        continue;
      }

      for (const model of matches) {
        if (!scopedModels.find((sm) => sm.model.provider === model.provider && sm.model.id === model.id)) {
          scopedModels.push({ model, thinkingLevel });
        }
      }
      continue;
    }

    const { model, thinkingLevel: parsedLevel, warning } = parseModelPattern(searchPattern, availableModels);

    if (warning) console.warn(`Warning: ${warning}`);
    if (!model) {
      console.warn(`Warning: No models match pattern "${pattern}"`);
      continue;
    }

    const effectiveLevel = thinkingLevel || parsedLevel;
    if (!scopedModels.find((sm) => sm.model.provider === model.provider && sm.model.id === model.id)) {
      scopedModels.push({ model, thinkingLevel: effectiveLevel });
    }
  }

  return scopedModels;
}

function matchGlob(str: string, pattern: string): boolean {
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
  return regex.test(str);
}

/**
 * Resolve a single model from CLI options
 */
export function resolveCliModel(options: {
  cliProvider?: string;
  cliModel?: string;
  modelRegistry: ModelRegistry;
}): ResolveCliModelResult {
  const { cliProvider, cliModel, modelRegistry } = options;

  if (!cliModel) {
    return { model: undefined, warning: undefined, error: undefined };
  }

  const availableModels = modelRegistry.getAll();
  if (availableModels.length === 0) {
    return {
      model: undefined,
      warning: undefined,
      error: "No models available. Check your installation or add models to models.json.",
    };
  }

  const providerMap = new Map<string, string>();
  for (const m of availableModels) {
    providerMap.set(m.provider.toLowerCase(), m.provider);
  }

  let provider = cliProvider ? providerMap.get(cliProvider.toLowerCase()) : undefined;
  if (cliProvider && !provider) {
    return {
      model: undefined,
      warning: undefined,
      error: `Unknown provider "${cliProvider}". Use --list-models to see available providers.`,
    };
  }

  let pattern = cliModel;
  let inferredProvider = false;

  if (!provider) {
    const slashIndex = cliModel.indexOf("/");
    if (slashIndex !== -1) {
      const maybeProvider = cliModel.substring(0, slashIndex);
      const canonical = providerMap.get(maybeProvider.toLowerCase());
      if (canonical) {
        provider = canonical;
        pattern = cliModel.substring(slashIndex + 1);
        inferredProvider = true;
      }
    }
  }

  if (!provider) {
    const lower = cliModel.toLowerCase();
    const exact = availableModels.find(
      (m) => m.id.toLowerCase() === lower || `${m.provider}/${m.id}`.toLowerCase() === lower
    );
    if (exact) {
      return { model: exact, warning: undefined, thinkingLevel: undefined, error: undefined };
    }
  }

  if (cliProvider && provider) {
    const prefix = `${provider}/`;
    if (cliModel.toLowerCase().startsWith(prefix.toLowerCase())) {
      pattern = cliModel.substring(prefix.length);
    }
  }

  const candidates = provider ? availableModels.filter((m) => m.provider === provider) : availableModels;
  const { model, thinkingLevel, warning } = parseModelPattern(pattern, candidates, {
    allowInvalidThinkingLevelFallback: false,
  });

  if (model) {
    return { model, thinkingLevel, warning, error: undefined };
  }

  const display = provider ? `${provider}/${pattern}` : cliModel;
  return {
    model: undefined,
    thinkingLevel: undefined,
    warning,
    error: `Model "${display}" not found. Use --list-models to see available models.`,
  };
}

/**
 * Find the initial model based on priority
 */
export async function findInitialModel(options: {
  cliProvider?: string;
  cliModel?: string;
  scopedModels: ScopedModel[];
  isContinuing: boolean;
  defaultProvider?: string;
  defaultModelId?: string;
  defaultThinkingLevel?: string;
  modelRegistry: ModelRegistry;
}): Promise<InitialModelResult> {
  const { cliProvider, cliModel, scopedModels, isContinuing, defaultProvider, defaultModelId, defaultThinkingLevel, modelRegistry } = options;

  const DEFAULT_THINKING = "auto";

  if (cliProvider && cliModel) {
    const resolved = resolveCliModel({ cliProvider, cliModel, modelRegistry });
    if (resolved.error) {
      console.error(resolved.error);
      process.exit(1);
    }
    if (resolved.model) {
      return { model: resolved.model, thinkingLevel: DEFAULT_THINKING, fallbackMessage: undefined };
    }
  }

  if (scopedModels.length > 0 && !isContinuing) {
    return {
      model: scopedModels[0].model,
      thinkingLevel: scopedModels[0].thinkingLevel ?? defaultThinkingLevel ?? DEFAULT_THINKING,
      fallbackMessage: undefined,
    };
  }

  if (defaultProvider && defaultModelId) {
    const found = modelRegistry.find(defaultProvider, defaultModelId);
    if (found) {
      return { model: found, thinkingLevel: defaultThinkingLevel ?? DEFAULT_THINKING, fallbackMessage: undefined };
    }
  }

  const availableModels = await modelRegistry.getAvailable();
  if (availableModels.length > 0) {
    for (const [prov, defaultId] of Object.entries(defaultModelPerProvider)) {
      const match = availableModels.find((m) => m.provider === prov && m.id === defaultId);
      if (match) {
        return { model: match, thinkingLevel: DEFAULT_THINKING, fallbackMessage: undefined };
      }
    }
    return { model: availableModels[0], thinkingLevel: DEFAULT_THINKING, fallbackMessage: undefined };
  }

  return { model: undefined, thinkingLevel: DEFAULT_THINKING, fallbackMessage: undefined };
}

/**
 * Restore model from session with fallback
 */
export async function restoreModelFromSession(
  savedProvider: string,
  savedModelId: string,
  currentModel: ModelEntry | undefined,
  shouldPrintMessages: boolean,
  modelRegistry: ModelRegistry
): Promise<{ model: ModelEntry | undefined; fallbackMessage: string | undefined }> {
  const restoredModel = modelRegistry.find(savedProvider, savedModelId);
  const hasConfiguredAuth = restoredModel ? modelRegistry.hasConfiguredAuth(restoredModel) : false;

  if (restoredModel && hasConfiguredAuth) {
    if (shouldPrintMessages) {
      console.log(`Restored model: ${savedProvider}/${savedModelId}`);
    }
    return { model: restoredModel, fallbackMessage: undefined };
  }

  const reason = !restoredModel ? "model no longer exists" : "no auth configured";

  if (shouldPrintMessages) {
    console.warn(`Warning: Could not restore model ${savedProvider}/${savedModelId} (${reason}).`);
  }

  if (currentModel) {
    if (shouldPrintMessages) {
      console.log(`Falling back to: ${currentModel.provider}/${currentModel.id}`);
    }
    return {
      model: currentModel,
      fallbackMessage: `Could not restore model ${savedProvider}/${savedModelId} (${reason}). Using ${currentModel.provider}/${currentModel.id}.`,
    };
  }

  const availableModels = await modelRegistry.getAvailable();
  if (availableModels.length > 0) {
    let fallbackModel: ModelEntry | undefined;
    for (const [prov, defaultId] of Object.entries(defaultModelPerProvider)) {
      const match = availableModels.find((m) => m.provider === prov && m.id === defaultId);
      if (match) {
        fallbackModel = match;
        break;
      }
    }
    if (!fallbackModel) fallbackModel = availableModels[0];

    if (shouldPrintMessages) {
      console.log(`Falling back to: ${fallbackModel.provider}/${fallbackModel.id}`);
    }
    return {
      model: fallbackModel,
      fallbackMessage: `Could not restore model ${savedProvider}/${savedModelId} (${reason}). Using ${fallbackModel.provider}/${fallbackModel.id}.`,
    };
  }

  return { model: undefined, fallbackMessage: undefined };
}