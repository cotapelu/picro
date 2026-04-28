# @picro/llm

LLM integration layer - Unified API for multiple LLM providers.

## Features

- 🌐 **98 Providers** - Access to 2966+ models
- 🔍 **Auto-discovery** - Automatically finds available providers
- 🔑 **Simple Auth** - Uses environment variables
- 📦 **Zero Config** - Works out of the box
- 🎯 **Model Matching** - Find models by provider and ID

## Installation

```bash
npm install @picro/llm
```

## Quick Start

```typescript
import { getModel, getProviders, getModels } from '@picro/llm';

// List all providers
const providers = getProviders();
console.log(`Available providers: ${providers.join(', ')}`);

// List all models from a provider
const openaiModels = getModels('openai');
console.log(openaiModels.map(m => m.id));

// Get a specific model
const model = getModel('openai', 'gpt-4');
console.log(model.id, model.reasoning, model.vision);
```

## Provider Support

Supports 98 providers including:

- **OpenAI** - GPT-4, GPT-3.5, o1, etc.
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus
- **Google** - Gemini Pro, PaLM 2
- **Mistral** - Mixtral, Codestral
- **Groq** - Llama 3, Mixtral (ultra-fast)
- **Together** - Llama 2, CodeLlama
- **Replicate** - Various open models
- **Local** - Ollama, LM Studio

And many more...

## Authentication

Set environment variables for each provider:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="..."
```

The library automatically picks up these keys.

## Model Info

```typescript
interface Model {
  id: string;              // "openai/gpt-4"
  name?: string;           // "GPT-4"
  description?: string;    // "Most capable GPT-4 model"
  provider: string;        // "openai"
  reasoning?: boolean;     // Supports reasoning/thinking
  vision?: boolean;       // Supports image input
  audio?: boolean;        // Supports audio input
  imageInput?: boolean;   // Supports image generation
}
```

## Advanced Usage

### Filter Available Models

```typescript
import { getModels, getProviders } from '@picro/llm';

// Get all reasoning models
const allModels = getModels();
const reasoningModels = allModels.filter(m => m.reasoning);

// Get vision-capable models from a provider
const openaiVision = getModels('openai').filter(m => m.vision);
```

### Provider Info

```typescript
const providers = getProviders();
for (const provider of providers) {
  const models = getModels(provider);
  console.log(`${provider}: ${models.length} models`);
}
```

## Model Discovery

Models are discovered from:

1. **models.dev API** - 2495 models from 116 providers
2. **OpenRouter API** - 268 models
3. **Vercel AI Gateway** - 160 models
4. **Local configs** - Custom provider definitions

Run `npm run generate-models` to update `src/models.generated.ts`.

## Performance

- **Lazy loading** - Models are loaded on-demand
- **Cached lookups** - Fast O(1) model retrieval
- **Tree-shakable** - Only include providers you use

## License

Apache-2.0

---

<p align="center">Unified LLM Access for the pi ecosystem</p>
