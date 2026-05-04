// SPDX-License-Identifier: Apache-2.0
/**
 * Model Resolver - Resolve model patterns to actual Model objects
 * 
 * Uses @picro/llm functions
 */

import { getModel, getModels, getProviders, type Model } from "../llm";

import { type ModelEntry } from "./model-registry";

// ============================================================================
// Constants
// ============================================================================

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

function findExactModelReferenceMatch(modelReference: string, models: ModelEntry[]): ModelEntry | undefined {
  const trimmedReference = modelReference.trim().toLowerCase();
  if (!trimmedReference) return undefined;

  // Try canonical format: provider/modelId
  for (const model of models) {
    if (`${model.provider}/${model.id}`.toLowerCase() === trimmedReference) {
      return model;
    }
  }

  // Try provider/modelId format
  const slashIndex = trimmedReference.indexOf("/");
  if (slashIndex !== -1) {
    const provider = trimmedReference.substring(0, slashIndex);
    const modelId = trimmedReference.substring(slashIndex + 1);
    for (const model of models) {
      if (model.provider.toLowerCase() === provider && model.id.toLowerCase() === modelId) {
        return model;
      }
    }
  }

  // Try bare model ID
  for (const model of models) {
    if (model.id.toLowerCase() === trimmedReference) {
      return model;
    }
  }

  return undefined;
}

function tryMatchModel(pattern: string, models: ModelEntry[]): ModelEntry | undefined {
  const exactMatch = findExactModelReferenceMatch(pattern, models);
  if (exactMatch) return exactMatch;

  const lower = pattern.toLowerCase();
  const matches = models.filter(
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
  models: ModelEntry[],
  options?: { allowInvalidThinkingLevelFallback?: boolean }
): ParsedModelResult {
  const exactMatch = tryMatchModel(pattern, models);
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
    const result = parseModelPattern(prefix, models, options);
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

    const result = parseModelPattern(prefix, models, options);
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

export async function resolveModelScope(
  patterns: string[],
  _modelRegistry: any
): Promise<ScopedModel[]> {
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

    // Get all models from llm
    let allModels: ModelEntry[] = [];
    if (searchPattern.includes("*") || searchPattern.includes("?")) {
      // Glob pattern - search all providers
      const lower = searchPattern.toLowerCase();
      for (const provider of getProviders()) {
        const models = getModels(provider);
        for (const model of models) {
          const fullId = `${model.provider}/${model.id}`.toLowerCase();
          if (matchGlob(fullId, lower) || matchGlob(model.id.toLowerCase(), lower)) {
            allModels.push(model);
          }
        }
      }
    } else {
      // Try direct lookup first
      const splitIdx = searchPattern.indexOf("/");
      if (splitIdx !== -1) {
        const provider = searchPattern.substring(0, splitIdx);
        const modelId = searchPattern.substring(splitIdx + 1);
        const model = getModel(provider, modelId);
        if (model) allModels = [model];
      }
      if (allModels.length === 0) {
        allModels = tryMatchModel(searchPattern, getModels("*") as any as ModelEntry[]) ? [tryMatchModel(searchPattern, getModels("*") as any as ModelEntry[])!] : [];
      }
    }

    if (allModels.length === 0 || !allModels[0]) {
      console.warn(`Warning: No models match pattern "${pattern}"`);
      continue;
    }

    for (const model of allModels) {
      if (!scopedModels.find((sm) => sm.model.provider === model.provider && sm.model.id === model.id)) {
        scopedModels.push({ model, thinkingLevel });
      }
    }
  }

  return scopedModels;
}

function matchGlob(str: string, pattern: string): boolean {
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
  return regex.test(str);
}

export function resolveCliModel(options: {
  cliProvider?: string;
  cliModel?: string;
  modelRegistry: any;
}): ResolveCliModelResult {
  const { cliProvider, cliModel } = options;

  if (!cliModel) {
    return { model: undefined, warning: undefined, error: undefined };
  }

  const allModels = getModels("*") as any as ModelEntry[];
  if (allModels.length === 0) {
    return {
      model: undefined,
      warning: undefined,
      error: "No models available. Check your installation or add models to models.json.",
    };
  }

  // Build provider lookup
  const providerMap = new Map<string, string>();
  for (const provider of getProviders()) {
    providerMap.set(provider.toLowerCase(), provider);
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
    const exact = findExactModelReferenceMatch(cliModel, allModels);
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

  const candidates = provider ? getModels(provider) : allModels;
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

export async function findInitialModel(options: {
  cliProvider?: string;
  cliModel?: string;
  scopedModels: ScopedModel[];
  isContinuing: boolean;
  defaultProvider?: string;
  defaultModelId?: string;
  defaultThinkingLevel?: string;
  modelRegistry: any;
}): Promise<InitialModelResult> {
  const { cliProvider, cliModel, scopedModels, isContinuing, defaultProvider, defaultModelId, defaultThinkingLevel } = options;

  const DEFAULT_THINKING = "auto";

  if (cliProvider && cliModel) {
    const resolved = resolveCliModel({ cliProvider, cliModel, modelRegistry: options.modelRegistry });
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
    const found = getModel(defaultProvider, defaultModelId);
    if (found) {
      return { model: found, thinkingLevel: defaultThinkingLevel ?? DEFAULT_THINKING, fallbackMessage: undefined };
    }
  }

  // Try first available from llm
  for (const provider of getProviders()) {
    const models = getModels(provider);
    if (models.length > 0) {
      return { model: models[0], thinkingLevel: DEFAULT_THINKING, fallbackMessage: undefined };
    }
  }

  return { model: undefined, thinkingLevel: DEFAULT_THINKING, fallbackMessage: undefined };
}

export async function restoreModelFromSession(
  savedProvider: string,
  savedModelId: string,
  currentModel: ModelEntry | undefined,
  shouldPrintMessages: boolean,
  _modelRegistry: any
): Promise<{ model: ModelEntry | undefined; fallbackMessage: string | undefined }> {
  const restoredModel = getModel(savedProvider, savedModelId);

  if (restoredModel) {
    if (shouldPrintMessages) {
      console.log(`Restored model: ${savedProvider}/${savedModelId}`);
    }
    return { model: restoredModel, fallbackMessage: undefined };
  }

  const reason = "model no longer exists";

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

  // Try first available
  for (const provider of getProviders()) {
    const models = getModels(provider);
    if (models.length > 0) {
      const fallbackModel = models[0];
      if (shouldPrintMessages) {
        console.log(`Falling back to: ${fallbackModel.provider}/${fallbackModel.id}`);
      }
      return {
        model: fallbackModel,
        fallbackMessage: `Could not restore model ${savedProvider}/${savedModelId} (${reason}). Using ${fallbackModel.provider}/${fallbackModel.id}.`,
      };
    }
  }

  return { model: undefined, fallbackMessage: undefined };
}