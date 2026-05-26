"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Model Resolver - Resolve model patterns to actual Model objects
 * Moved from agent/ to session/ because it's used by session services.
 *
 * Uses @picro/llm functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultModelPerProvider = void 0;
exports.parseModelPattern = parseModelPattern;
exports.resolveModelScope = resolveModelScope;
exports.resolveCliModel = resolveCliModel;
exports.findInitialModel = findInitialModel;
exports.restoreModelFromSession = restoreModelFromSession;
// ============================================================================
// Constants
// ============================================================================
exports.defaultModelPerProvider = {
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
// Helper Functions
// ============================================================================
function isAlias(id) {
    if (id.endsWith("-latest"))
        return true;
    const datePattern = /-\d{8}$/;
    return !datePattern.test(id);
}
function findExactModelReferenceMatch(modelReference, models) {
    const trimmedReference = modelReference.trim().toLowerCase();
    if (!trimmedReference)
        return undefined;
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
function tryMatchModel(pattern, models) {
    const exactMatch = findExactModelReferenceMatch(pattern, models);
    if (exactMatch)
        return exactMatch;
    const lower = pattern.toLowerCase();
    const matches = models.filter((m) => m.id.toLowerCase().includes(lower) || m.name?.toLowerCase().includes(lower));
    if (matches.length === 0)
        return undefined;
    const aliases = matches.filter((m) => isAlias(m.id));
    const datedVersions = matches.filter((m) => !isAlias(m.id));
    if (aliases.length > 0) {
        aliases.sort((a, b) => b.id.localeCompare(a.id));
        return aliases[0];
    }
    else {
        datedVersions.sort((a, b) => b.id.localeCompare(a.id));
        return datedVersions[0];
    }
}
const thinkingLevels = ["off", "low", "medium", "high", "auto"];
function isValidThinkingLevel(level) {
    return thinkingLevels.includes(level);
}
function parseModelPattern(pattern, models, options) {
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
                thinkingLevel: suffix,
                warning: result.warning,
            };
        }
    }
    return { model: undefined, thinkingLevel: undefined, warning: undefined };
}
function resolveModelScope(scope, model, registry) {
    if (!scope)
        return undefined;
    // Check for just thinking level
    if (isValidThinkingLevel(scope)) {
        return { model, thinkingLevel: scope };
    }
    // Parse full syntax: <modelId>:<thinkingLevel>
    const parsed = parseModelPattern(scope, [model]);
    if (parsed.model && parsed.thinkingLevel) {
        return { model: parsed.model, thinkingLevel: parsed.thinkingLevel };
    }
    return undefined;
}
async function resolveCliModel(options, signal) {
    const { initialModel, modelScope, registry } = options;
    let error;
    if (signal?.aborted) {
        return { model: undefined, thinkingLevel: undefined, warning: undefined, error: "Aborted" };
    }
    // Step 1: Parse initial model (if provided)
    let model;
    let thinkingLevel;
    if (initialModel) {
        const allModels = registry.getAll();
        const parsed = parseModelPattern(initialModel, allModels);
        if (parsed.model) {
            model = parsed.model;
            thinkingLevel = parsed.thinkingLevel;
        }
        else {
            error = `Unknown model: ${initialModel}`;
            return { model: undefined, thinkingLevel: undefined, warning: undefined, error };
        }
    }
    // Step 2: Apply model scope (thinking level override)
    if (model && modelScope) {
        const scoped = resolveModelScope(modelScope, model, registry);
        if (scoped) {
            model = scoped.model;
            thinkingLevel = scoped.thinkingLevel;
        }
        else if (!isValidThinkingLevel(modelScope)) {
            error = `Invalid model scope: ${modelScope}`;
            return { model: undefined, thinkingLevel: undefined, warning: undefined, error };
        }
    }
    // Step 3: Validate auth
    if (model && !registry.hasConfiguredAuth(model)) {
        error = `No API key configured for ${model.provider}`;
        return { model: undefined, thinkingLevel: undefined, warning: undefined, error };
    }
    return { model, thinkingLevel, warning: undefined, error };
}
function findInitialModel(options, signal) {
    const { defaultModel, configModel, initialModel, registry } = options;
    const models = registry.getAll();
    // Priority: initialModel > configModel > defaultModel
    const candidates = [initialModel, configModel, defaultModel].filter(Boolean);
    for (const candidate of candidates) {
        if (!candidate)
            continue;
        const parsed = parseModelPattern(candidate, models);
        if (parsed.model) {
            if (!registry.hasConfiguredAuth(parsed.model)) {
                continue; // skip models without auth
            }
            return {
                model: parsed.model,
                thinkingLevel: parsed.thinkingLevel || "medium",
                fallbackMessage: undefined,
            };
        }
    }
    return {
        model: undefined,
        thinkingLevel: "medium",
        fallbackMessage: "No model selected or available. Use --model to specify a model.",
    };
}
async function restoreModelFromSession(sessionModel, registry, signal) {
    if (!sessionModel)
        return undefined;
    const models = registry.getAll();
    const parsed = parseModelPattern(sessionModel, models);
    return parsed.model;
}
//# sourceMappingURL=model-resolver.js.map