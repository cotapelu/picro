# picro LLM Module - Implementation TODO

**Goal**: Achieve feature parity with pi-ai for OpenAI-compatible + API key only use case  
**Strategy**: Self-implement, reference pi-ai for behavior/architecture only, NO code copying  
**Scope**: API key only + OpenAI-compatible providers only (vLLM, SGLang, llama.cpp, Qwen, etc.)

---

## 📊 **Current State vs Target**

| Area | Current | Target (pi-ai parity) |
|------|---------|----------------------|
| Model Schema Validation | ✅ Full schema with validation | ✅ Full schema with validation |
| Prompt Cache Support | ✅ Full (config, headers, defaults) | ✅ Full (config, headers, warming) |
| Cache Warming | ✅ Basic implementation | Background warming on idle/startup |
| Cost Tiers | ✅ Tiered pricing support | Tiered pricing support |
| Thinking Budget Fields | ✅ Per-backend field names | Per-backend field names |
| Chat Template Thinking | ✅ Template kwargs for thinking | Template kwargs for thinking |
| Model Input/Image Limits | ✅ Full limits + validation | Full limits + auto-resize |
| Cost Tiers | ✅ Multi-tier pricing support | Multi-tier pricing |
| Session Affinity | ✅ openai/openai-nosession/openrouter | openai/openai-nosession/openrouter |
| OpenRouter Routing | ✅ Full routing config | Full routing config |
| Model Validation | ✅ Schema validation on load | Schema validation on load |

---

## ✅ **COMPLETED PHASES**

### ✅ Phase 1: Model Schema & Validation (Foundation)
- ✅ Created `src/llm/model-schema.ts` with comprehensive validation
- ✅ Updated `src/llm/types.ts` with extended Model interface
- ✅ Updated `src/llm/models.ts` with validation on load
- ✅ Added `ModelCostTier`, `ModelPromptCache`, `ModelInputLimits`, `ModelImageInputLimits`, `ModelImageResizeOptions` types

### ✅ Phase 2: Prompt Cache Support (Cost Optimization)
- ✅ Added `promptCache`, `promptCacheRetention` to Model interface
- ✅ Added `promptCache` to `StreamOptions`
- ✅ Updated `openai-compatible.ts` to send cache control headers
- ✅ Added default cache configs for Anthropic, OpenAI, Google
- ✅ Added `getModelPromptCacheConfig` and `getModelPromptCacheRetention` helpers

### ✅ Phase 3: Cache Warming (Basic Implementation)
- ✅ Created `src/llm/cache-warming.ts` with `CacheWarmer` class
- ✅ Supports warming single model or multiple with concurrency control
- ✅ Status tracking (idle/warming/warmed/error)
- ✅ Exported from `index.ts`

### ✅ Phase 4: Cost Tiers & Accurate Cost Calculation
- ✅ Updated `calculateCost` in `models.ts` to support tiered pricing
- ✅ Falls back to flat rates when no tiers defined

### ✅ Phase 5: Thinking Budget & Chat Template
- ✅ Created `src/llm/compat-schema.ts` with:
  - `getThinkingBudgetField` - per-backend field names (vLLM, Qwen, llama.cpp)
  - `getSessionAffinityFormat` - openai/openai-nosession/openrouter
  - `mapEffortToTokens` - effort to token mapping
  - `getChatTemplateThinkingKwargs` - chat template thinking config
  - `getOpenRouterRouting` - OpenRouter routing config
  - `getSessionAffinityFormat` - session affinity header
  - `mapEffortToTokens` - effort to token mapping
- ✅ Updated `openai-compatible.ts` to use these functions

### ✅ Phase 6: Input/Image Limits & Validation
- ✅ Added `inputLimits`, `images` limits to Model schema
- ✅ Validation for maxRequestBytes, maxPerMessage, maxPerRequest
- ✅ Image resize options validation

### ✅ Phase 7: Session Affinity & OpenRouter Routing
- ✅ Session affinity headers (openai/openai-nosession/openrouter)
- ✅ OpenRouter routing headers (x-openrouter-* headers)
- ✅ Integrated into `buildParams` in `openai-compatible.ts`

### ✅ Phase 9: Model Validation on Load
- ✅ `validateAllModels` runs on module load in `models.ts`
- ✅ Logs warnings for invalid configs

---

## 🔄 **REMAINING PHASES**

### ⏳ Phase 8: Model Catalog Auto-Refresh (Optional)
- [ ] Create `src/llm/model-catalog.ts` with auto-refresh
- [ ] ETag/Last-Modified caching
- [ ] Periodic refresh (24h)
- [ ] Local overrides preserved

### ⏳ Phase 10: Testing & Integration
- [ ] Unit tests for model-schema validation
- [ ] Unit tests for cache warming
- [ ] Unit tests for compat-schema functions
- [ ] Integration tests for prompt cache flow
- [ ] Integration tests for cache warming
- [ ] Integration tests for cost tiers
- [ ] Integration tests for thinking budget mapping
- [ ] Integration tests for session affinity & OpenRouter routing

---

## 📋 **FILE CREATION CHECKLIST**

### New Files Created:
- ✅ `src/llm/model-schema.ts`
- ✅ `src/llm/cache-warming.ts`
- ✅ `src/llm/compat-schema.ts`

### Files Updated:
- ✅ `src/llm/types.ts` - Extended Model, StreamOptions
- ✅ `src/llm/models.ts` - Validation, cost tiers, cache defaults
- ✅ `src/llm/providers/openai-compatible.ts` - Cache headers, thinking budget, limits, session affinity
- ✅ `src/llm/index.ts` - Export new types/functions
- ✅ `src/llm/providers/openai-compatible.branches.test.ts` - Updated test

---

## 🎯 **DEFINITION OF DONE PER PHASE**

| Phase | Done When |
|-------|-----------|
| 1 | `validateModel()` passes for all generated models; TypeScript compiles |
| 2 | Request with `promptCache` sends correct headers; repeat request shows cache hit |
| 3 | `warm()` sends request; `warmOnIdle()` triggers on agent idle; status tracking works |
| 4 | Tiered model shows correct cost for small vs large requests |
| 5 | vLLM/SGLang/Qwen receive correct thinking budget field; chat template works |
| 6 | Oversized request/image throws clear error; auto-resize works |
| 7 | Session affinity header sent; OpenRouter routing headers sent |
| 8 | Catalog refreshes on startup; ETag caching works; local overrides preserved |
| 9 | Invalid model configs logged on startup; zero runtime surprises |
| 10 | All tests pass; integration tests verify end-to-end flows |

---

## 📝 **IMPLEMENTATION NOTES**

1. **NO CODE COPYING** - Reference pi-ai for behavior only, implement from scratch
2. **TypeScript First** - Types before implementation, strict mode
3. **Test as You Go** - Unit test each phase before moving on
4. **Backward Compatible** - All new fields optional, defaults preserve current behavior
5. **Performance** - Cache warming async, non-blocking; validation only on load
6. **Observability** - Emit events for cache warming, validation warnings, cost calculations

---

## 📚 **PI-AI REFERENCE FILES (For Behavior Only)**

| Feature | Pi-AI Reference Files |
|---------|----------------------|
| Model Schema | `packages/ai/src/providers/model-schema.ts` |
| Compat Schema | `packages/ai/src/providers/compat-schema.ts` |
| Cache Warming | `packages/ai/src/cache-warming.ts` + `packages/coding-agent/src/core/cache-warmer.ts` |
| OpenAI Completions | `packages/ai/src/api/openai-completions.ts` |
| Anthropic Messages | `packages/ai/src/api/anthropic-messages.ts` |
| Model Catalog | `packages/ai/src/model-catalog.ts`, `models-store.ts`, `remote-catalog-provider.ts` |
| OpenAI Compatible Provider | `packages/ai/src/providers/openai.ts` |
| Types | `packages/ai/src/types.ts`, `providers/model-schema.ts`, `compat-schema.ts` |

---

## ⏱️ **ESTIMATED TIMELINE**

| Phase | Effort | Cumulative |
|-------|--------|------------|
| 1: Model Schema | 2 days | 2 days |
| 2: Prompt Cache | 2 days | 4 days |
| 3: Cache Warming | 3 days | 7 days |
| 4: Cost Tiers | 1 day | 8 days |
| 5: Thinking Budget | 2 days | 10 days |
| 6: Input Limits | 2 days | 12 days |
| 7: Session Affinity | 1 day | 13 days |
| 8: Model Catalog | 3 days | 16 days |
| 9: Validation | 1 day | 17 days |
| 10: Testing | 3 days | **20 days (4 weeks)** |

---

## 🚫 **OUT OF SCOPE (Explicitly NOT Doing)**

- OAuth / Auth system (API key only)
- Non-OpenAI-compatible providers (Anthropic native, Google, Bedrock, etc.)
- Image generation models
- Classifier models
- MCP servers
- Telemetry
- Plugin system

---

*Generated from comprehensive pi-ai vs picro analysis. Implement phases sequentially. Test each phase before proceeding.*