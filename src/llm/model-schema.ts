/**
 * Model Schema Validation
 * 
 * Schema definitions for Model configuration with validation.
 * Reference: pi-ai providers/model-schema.ts
 * Self-implemented, no code copying.
 */

export interface ModelCostRates {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface ModelCostTier {
  inputTokensAbove: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface ModelCost {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  tiers?: ModelCostTier[];
}

export interface ModelPromptCache {
  short: number;
  long: number;
}

export interface ModelImageResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number;
  jpegQuality?: number;
}

export interface ModelImageInputLimits {
  maxPerMessage?: number;
  maxPerRequest?: number;
  resize?: ModelImageResizeOptions;
}

export interface ModelInputLimits {
  maxRequestBytes?: number;
  images?: ModelImageInputLimits;
}

export interface ChatTemplateThinkingKwarg {
  $var: "thinking.enabled" | "thinking.effort" | "thinking.budget";
  omitWhenOff?: boolean;
}

export interface OpenRouterRouting {
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
  data_collection?: "deny" | "allow";
  zdr?: boolean;
  enforce_distillable_text?: boolean;
  order?: string[];
  only?: string[];
  ignore?: string[];
  quantizations?: string[];
  sort?: "price" | "throughput" | { by: string; partition?: string };
  max_price?: {
    prompt?: number;
    completion?: number;
    image?: number;
    request?: number;
  };
  preferred_min_throughput?: number | { p50?: number; p75?: number; p90?: number; p99?: number };
  preferred_max_latency?: number | { p50?: number; p75?: number; p90?: number; p99?: number };
}

export type ThinkingBudgetField = "thinking_token_budget" | "thinking_budget" | "thinking_budget_tokens";
export type SessionAffinityFormat = "openai" | "openai-nosession" | "openrouter";

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && value > 0 && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

function validateCostRates(obj: unknown, prefix: string) {
  const errors: { field: string; message: string; value?: unknown }[] = [];
  if (!isObject(obj)) {
    return [{ field: prefix, message: "must be an object", value: obj }];
  }
  const rates = obj as Record<string, unknown>;
  for (const key of ["input", "output", "cacheRead", "cacheWrite"]) {
    const val = rates[key];
    if (typeof val !== "number" || val < 0 || !Number.isFinite(val)) {
      errors.push({ field: `${prefix}.${key}`, message: "must be a non-negative number", value: val });
    }
  }
  return errors;
}

function validatePromptCacheConfig(obj: unknown, prefix: string) {
  const errors: { field: string; message: string; value?: unknown }[] = [];
  if (!isObject(obj)) {
    return [{ field: prefix, message: "must be an object", value: obj }];
  }
  const cache = obj as Record<string, unknown>;
  for (const key of ["short", "long"]) {
    const val = cache[key];
    if (typeof val !== "number" || val <= 0 || !Number.isFinite(val)) {
      errors.push({ field: `${prefix}.${key}`, message: "must be a positive number (seconds)", value: val });
    }
  }
  return errors;
}

function validateImageResizeOptions(obj: unknown, prefix: string) {
  const errors: { field: string; message: string; value?: unknown }[] = [];
  if (!isObject(obj)) return errors;
  const resize = obj as Record<string, unknown>;
  for (const key of ["maxWidth", "maxHeight", "maxBytes"]) {
    const val = resize[key];
    if (val !== undefined && (typeof val !== "number" || val <= 0 || !Number.isFinite(val))) {
      errors.push({ field: `${prefix}.${key}`, message: "must be a positive number", value: val });
    }
  }
  const qVal = resize.jpegQuality;
  if (qVal !== undefined && typeof qVal === "number" && (!Number.isInteger(qVal) || qVal < 1 || qVal > 100)) {
    errors.push({ field: `${prefix}.jpegQuality`, message: "must be integer 1-100", value: qVal });
  }
  return errors;
}

function validateImageInputLimits(obj: unknown, prefix: string) {
  const errors: { field: string; message: string; value?: unknown }[] = [];
  if (!isObject(obj)) return [];
  const limits = obj as Record<string, unknown>;
  for (const key of ["maxPerMessage", "maxPerRequest"]) {
    const val = limits[key];
    if (val !== undefined && typeof val === "number" && (!Number.isInteger(val) || val < 1)) {
      return [{ field: `${prefix}.${key}`, message: "must be a positive integer", value: val }];
    }
  }
  if (limits.resize !== undefined) {
    const resizeErrors = validateImageResizeOptions(limits.resize, `${prefix}.resize`);
    return resizeErrors;
  }
  return [];
}

function validateInputLimits(obj: unknown, prefix: string) {
  const errors: { field: string; message: string; value?: unknown }[] = [];
  if (!isObject(obj)) return [];
  const limits = obj as Record<string, unknown>;
  const maxReqVal = limits.maxRequestBytes;
  if (maxReqVal !== undefined && (typeof maxReqVal !== "number" || maxReqVal <= 0 || !Number.isFinite(maxReqVal))) {
    errors.push({ field: `${prefix}.maxRequestBytes`, message: "must be a positive number", value: maxReqVal });
  }
  if (limits.images !== undefined) {
    const imgErrors = validateImageInputLimits(limits.images, `${prefix}.images`);
    if (imgErrors.length > 0) errors.push(...imgErrors);
  }
  return errors;
}

function validateCostTier(obj: unknown, prefix: string) {
  const errors: { field: string; message: string; value?: unknown }[] = [];
  if (!isObject(obj)) {
    return [{ field: prefix, message: "must be an object", value: obj }];
  }
  const tier = obj as Record<string, unknown>;
  const val = tier.inputTokensAbove;
  if (typeof val !== "number" || val <= 0 || !Number.isFinite(val)) {
    return [{ field: `${prefix}.inputTokensAbove`, message: "must be a positive number", value: val }];
  }
  const rateErrors = validateCostRates(tier, prefix);
  if (rateErrors.length > 0) errors.push(...rateErrors);
  return errors;
}

export function validateModel(model: Record<string, unknown>) {
  const errors: { field: string; message: string; value?: unknown }[] = [];
  const warnings: { field: string; message: string; value?: unknown }[] = [];

  function isStringVal(val: unknown): val is string {
    return typeof val === "string";
  }
  function isPositiveNumberVal(val: unknown): val is number {
    return typeof val === "number" && val > 0 && Number.isFinite(val);
  }
  function isNonNegativeNumberVal(val: unknown): val is number {
    return typeof val === "number" && val >= 0 && Number.isFinite(val);
  }
  function isObjectVal(val: unknown): val is Record<string, unknown> {
    return typeof val === "object" && val !== null && !Array.isArray(val);
  }

  // Required fields
  for (const field of ["id", "name", "api", "provider", "baseUrl"]) {
    const val = model[field];
    if (!isStringVal(val) || (val as string).trim() === "") {
      errors.push({ field, message: "required non-empty string", value: val });
    }
  }

  // reasoning
  if (model.reasoning !== undefined && typeof model.reasoning !== "boolean") {
    errors.push({ field: "reasoning", message: "must be boolean", value: model.reasoning });
  }

  // input modalities
  if (!Array.isArray(model.input) || model.input.length === 0) {
    errors.push({ field: "input", message: "must be non-empty array", value: model.input });
  } else {
    for (const modality of model.input) {
      if (!["text", "image"].includes(modality as string)) {
        warnings.push({ field: "input", message: `unknown modality: ${modality}`, value: modality });
      }
    }
  }

  // cost
  if (model.cost === undefined) {
    errors.push({ field: "cost", message: "required", value: undefined });
  } else {
    const cost = model.cost as Record<string, unknown>;
    const rateErrors = validateCostRates(cost, "cost");
    if (rateErrors.length > 0) errors.push(...rateErrors);
    if (Array.isArray(cost.tiers)) {
      for (let i = 0; i < cost.tiers.length; i++) {
        const tier = cost.tiers[i] as Record<string, unknown>;
        if (!tier || typeof tier !== "object") {
          errors.push({ field: `cost.tiers[${i}]`, message: "must be an object", value: tier });
        } else {
          const tierVal = tier.inputTokensAbove;
          if (typeof tierVal !== "number" || tierVal <= 0 || !Number.isFinite(tierVal)) {
            errors.push({ field: `cost.tiers[${i}].inputTokensAbove`, message: "must be a positive number", value: tierVal });
          }
          const rateErrors = validateCostRates(tier, `cost.tiers[${i}]`);
          if (rateErrors.length > 0) errors.push(...rateErrors);
        }
      }
      // Check tiers are sorted by inputTokensAbove
      const tiers = cost.tiers as Array<{ inputTokensAbove: number }>;
      for (let i = 1; i < tiers.length; i++) {
        if (tiers[i].inputTokensAbove <= tiers[i - 1].inputTokensAbove) {
          warnings.push({ field: `cost.tiers[${i}]`, message: "tiers should be sorted by inputTokensAbove ascending", value: tiers[i] });
        }
      }
    }
  }

  // contextWindow, maxTokens
  for (const field of ["contextWindow", "maxTokens"]) {
    const val = model[field];
    if (typeof val !== "number" || val <= 0 || !Number.isFinite(val)) {
      errors.push({ field, message: "must be a positive number", value: val });
    }
  }

  // promptCache
  if (model.promptCache !== undefined) {
    const cache = model.promptCache as Record<string, unknown>;
    if (!cache || typeof cache !== "object") {
      errors.push({ field: "promptCache", message: "must be an object", value: model.promptCache });
    } else {
      for (const key of ["short", "long"]) {
        const val = cache[key];
        if (typeof val !== "number" || val <= 0 || !Number.isFinite(val)) {
          errors.push({ field: `promptCache.${key}`, message: "must be a positive number (seconds)", value: val });
        }
      }
    }
  }

  // promptCacheRetention
  if (model.promptCacheRetention !== undefined && !["short", "long"].includes(model.promptCacheRetention as string)) {
    errors.push({ field: "promptCacheRetention", message: "must be 'short' or 'long'", value: model.promptCacheRetention });
  }

  // inputLimits
  if (model.inputLimits !== undefined) {
    const limits = model.inputLimits as Record<string, unknown>;
    if (limits && typeof limits === "object") {
      const maxReqVal = limits.maxRequestBytes;
      if (maxReqVal !== undefined && (typeof maxReqVal !== "number" || maxReqVal <= 0 || !Number.isFinite(maxReqVal))) {
        errors.push({ field: "inputLimits.maxRequestBytes", message: "must be a positive number", value: maxReqVal });
      }
      if (limits.images !== undefined) {
        const imgLimits = limits.images as Record<string, unknown>;
        if (imgLimits && typeof imgLimits === "object") {
          for (const key of ["maxPerMessage", "maxPerRequest"]) {
            const val = imgLimits[key];
            if (val !== undefined && typeof val === "number" && (!Number.isInteger(val) || val < 1)) {
              errors.push({ field: `inputLimits.images.${key}`, message: "must be a positive integer", value: val });
            }
          }
          if (imgLimits.resize !== undefined) {
            const resize = imgLimits.resize as Record<string, unknown>;
            if (resize && typeof resize === "object") {
              for (const key of ["maxWidth", "maxHeight", "maxBytes"]) {
                const val = resize[key];
                if (val !== undefined && (typeof val !== "number" || val <= 0 || !Number.isFinite(val))) {
                  errors.push({ field: `inputLimits.images.resize.${key}`, message: "must be a positive number", value: val });
                }
              }
              const q = resize.jpegQuality;
              if (q !== undefined && typeof q === "number" && (!Number.isInteger(q) || q < 1 || q > 100)) {
                errors.push({ field: "inputLimits.images.resize.jpegQuality", message: "must be integer 1-100", value: q });
              }
            }
          }
        }
      }
    }
  }

  // costTiers
  if (model.costTiers !== undefined) {
    if (!Array.isArray(model.costTiers)) {
      errors.push({ field: "costTiers", message: "must be an array", value: model.costTiers });
    } else {
      for (let i = 0; i < model.costTiers.length; i++) {
        const tier = model.costTiers[i] as Record<string, unknown>;
        if (!tier || typeof tier !== "object") {
          errors.push({ field: `costTiers[${i}]`, message: "must be an object", value: tier });
        } else {
          const tierVal = tier.inputTokensAbove;
          if (typeof tierVal !== "number" || tierVal <= 0 || !Number.isFinite(tierVal)) {
            errors.push({ field: `costTiers[${i}].inputTokensAbove`, message: "must be a positive number", value: tierVal });
          }
          const rateErrors = validateCostRates(tier, `costTiers[${i}]`);
          if (rateErrors.length > 0) errors.push(...rateErrors);
        }
      }
    }
  }

  // sessionAffinityFormat
  if (model.sessionAffinityFormat !== undefined && !["openai", "openai-nosession", "openrouter"].includes(model.sessionAffinityFormat as string)) {
    errors.push({ field: "sessionAffinityFormat", message: "must be 'openai', 'openai-nosession', or 'openrouter'", value: model.sessionAffinityFormat });
  }

  // thinkingBudgetField
  if (model.thinkingBudgetField !== undefined && !["thinking_token_budget", "thinking_budget", "thinking_budget_tokens"].includes(model.thinkingBudgetField as string)) {
    errors.push({ field: "thinkingBudgetField", message: "must be 'thinking_token_budget', 'thinking_budget', or 'thinking_budget_tokens'", value: model.thinkingBudgetField });
  }

  // thinkingLevelMap
  if (model.thinkingLevelMap !== undefined) {
    const map = model.thinkingLevelMap as Record<string, unknown>;
    if (typeof map !== "object" || map === null) {
      errors.push({ field: "thinkingLevelMap", message: "must be an object", value: map });
    } else {
      for (const [level, value] of Object.entries(map)) {
        if (value !== null && !Number.isInteger(value as number)) {
          warnings.push({ field: `thinkingLevelMap.${level}`, message: "should be integer or null", value });
        }
      }
    }
  }

  // compat
  if (model.compat !== undefined && (typeof model.compat !== "object" || model.compat === null || Array.isArray(model.compat))) {
    errors.push({ field: "compat", message: "must be an object", value: model.compat });
  }

  // headers
  if (model.headers !== undefined && (typeof model.headers !== "object" || model.headers === null || Array.isArray(model.headers))) {
    errors.push({ field: "headers", message: "must be an object", value: model.headers });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateAllModels(models: Record<string, Record<string, Record<string, unknown>>>) {
  const allErrors: { field: string; message: string; value?: unknown }[] = [];
  const allWarnings: { field: string; message: string; value?: unknown }[] = [];

  for (const [provider, providerModels] of Object.entries(models)) {
    for (const [modelId, model] of Object.entries(providerModels)) {
      const result = validateModel(model);
      if (!result.valid) {
        for (const err of result.errors) {
          allErrors.push({ ...err, field: `${provider}.${modelId}.${err.field}` });
        }
      }
      for (const warn of result.warnings) {
        allWarnings.push({ ...warn, field: `${provider}.${modelId}.${warn.field}` });
      }
    }
  }

  return { valid: allErrors.length === 0, errors: allErrors, warnings: allWarnings };
}