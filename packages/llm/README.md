# @picro/llm

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/autoresearch/llm)
[![Models](https://img.shields.io/badge/models-801-blue)](https://github.com/autoresearch/llm)

**Unified LLM API for 800+ models across 23 providers.** Built on OpenAI-compatible standard, featuring automatic model discovery, intelligent context management, tool calling, reasoning support, and real-time streaming.

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [🔍 API Reference](#-api-reference)
- [🌐 Supported Providers](#-supported-providers)
- [🔧 Compatibility System](#-compatibility-system)
- [🛠️ Tool Calling](#️-tool-calling)
- [🧠 Reasoning & Thinking](#-reasoning--thinking)
- [💰 Usage & Cost Tracking](#-usage--cost-tracking)
- [⚙️ Advanced Features](#️-advanced-features)
- [📁 Project Structure](#-project-structure)
- [🔨 Development](#-development)
- [📝 License](#-license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **800+ Models** | 23 providers, automatically discovered and updated |
| **Zero Config** | Works out of the box; generates models from APIs |
| **OpenAI-Compatible** | Single API for all providers |
| **Full Tool Support** | Function calling with JSON schema validation |
| **Reasoning** | Support for thinking modes (Claude, GPT, Gemini) |
| **Multimodal** | Text + image inputs |
| **Streaming** | Real-time events: text, thinking, tool calls |
| **Auto-Truncate** | Manages context windows automatically |
| **Retry Logic** | Exponential backoff with jitter |
| **Cost Tracking** | Automatic per-token cost calculation |
| **TypeScript** | Full type definitions included |
| **MIT License** | Completely open source, no restrictions |

---

## 📦 Installation

```bash
npm install @picro/llm
```

**Requirements:**
- Node.js 20+
- API keys for your chosen providers (set as environment variables)

---

## 🚀 Quick Start

```typescript
import { getModel, stream } from '@picro/llm';

// 1. Get a model
const model = getModel('nvidia-nim', 'stepfun-ai/step-3.5-flash');
// or: const model = getModel('openai', 'gpt-5.1');
// or: const model = getModel('openrouter', 'anthropic/claude-sonnet-4-5');

// 2. Prepare context
const context = {
  systemPrompt: 'You are a helpful coding assistant. Always provide concise, accurate answers.',
  messages: [
    { role: 'user', content: 'Explain async/await in JavaScript', timestamp: Date.now() }
  ],
  tools: [
    {
      name: 'search_web',
      description: 'Search the web for current information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  ]
};

// 3. Stream response
const result = await stream(model, context, {
  apiKey: process.env.NVIDIA_NIM_API_KEY, // optional if env var set
  temperature: 0.7,
  maxTokens: 4096
});

// 4. Handle streaming events
for await (const event of result) {
  switch (event.type) {
    case 'text_start':
      process.stdout.write('');
      break;
    case 'text_delta':
      process.stdout.write(event.delta);
      break;
    case 'thinking_start':
      console.log('\n[Thinking...]');
      break;
    case 'thinking_delta':
      process.stdout.write(event.delta);
      break;
    case 'toolcall_start':
      console.log(`\n[Tool: ${event.partial?.content?.[event.contentIndex]?.name}]`);
      break;
    case 'toolcall_delta':
      // Partial arguments streaming
      break;
    case 'done':
      console.log('\n✓ Complete');
      break;
    case 'error':
      console.error('Error:', event.error?.errorMessage);
      break;
  }
}

// 5. Get final result
const final = await result.result();
console.log('\n--- Summary ---');
console.log('Tokens:', final.usage.totalTokens);
console.log('Cost:', final.usage.cost.total, 'USD');
```

---

## 🔍 API Reference

### **Discovery APIs**

#### `getModel(provider: string, modelId: string): Model | undefined`
Get a specific model by provider and model ID.

```typescript
const model = getModel('anthropic', 'claude-3-7-sonnet-20250219');
// Returns: { id, name, api, provider, baseUrl, reasoning, input, cost, contextWindow, maxTokens, compat }
```

#### `getProviders(): string[]`
Get list of all available providers.

```typescript
const providers = getProviders(); // ['openai', 'anthropic', 'nvidia-nim', 'openrouter', ...]
```

#### `getModels(provider: string): Model[]`
Get all models for a provider.

```typescript
const models = getModels('openrouter'); // 249 models
```

---

### **Streaming API**

#### `stream(model: Model, context: Context, options?: StreamOptions): Promise<AssistantMessageEventStream>`

Stream a completion from the model.

**Parameters:**
- `model` - Model configuration (from `getModel()`)
- `context` - Conversation context
- `options` - Optional parameters:
  - `apiKey?: string` - Override API key (falls back to env vars)
  - `temperature?: number` - Sampling temperature (0-2)
  - `maxTokens?: number` - Maximum tokens to generate
  - `reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'` - For reasoning models
  - `signal?: AbortSignal` - Cancel request
  - `onPayload?: (params, model) => params` - Hook to modify request before sending
  - `headers?: Record<string, string>` - Additional headers

**Returns:** `AssistantMessageEventStream` - Async iterable of events

**Events:**
- `{ type: 'start', partial: output }` - Stream started
- `{ type: 'text_start', contentIndex, partial }` - Text block started
- `{ type: 'text_delta', contentIndex, delta, partial }` - Text delta
- `{ type: 'text_end', contentIndex, content, partial }` - Text block ended
- `{ type: 'thinking_start', contentIndex, partial }` - Thinking block started (reasoning)
- `{ type: 'thinking_delta', contentIndex, delta, partial }` - Thinking delta
- `{ type: 'thinking_end', contentIndex, content, partial }` - Thinking ended
- `{ type: 'toolcall_start', contentIndex, partial }` - Tool call started
- `{ type: 'toolcall_delta', contentIndex, delta, partial }` - Tool arguments delta (streaming JSON)
- `{ type: 'toolcall_end', contentIndex, toolCall, partial }` - Tool call finalized
- `{ type: 'done', reason, message }` - Stream completed successfully
- `{ type: 'error', reason, error }` - Stream failed

**Example with result:**
```typescript
const stream = await stream(model, context);
for await (const event of stream) {
  // handle events
}
const final = await stream.result(); // Wait for completion & get final message
```

---

#### `complete(model: Model, context: Context, options?: StreamOptions): Promise<any>`

Non-streaming completion (waits for full response).

```typescript
const result = await complete(model, context);
console.log(result.message.content[0].text);
console.log(result.usage.totalTokens);
```

---

### **Types**

#### `Model`
```typescript
interface Model {
  id: string;                    // Model ID (e.g., 'gpt-5.1')
  name: string;                  // Display name
  api: string;                   // API type: 'openai-completions', 'anthropic-messages', etc.
  provider: string;              // Provider name (e.g., 'openai', 'nvidia-nim')
  baseUrl: string;               // API endpoint
  reasoning: boolean;            // Supports reasoning/thinking
  input: ('text' | 'image')[];  // Supported input modalities
  cost: {
    input: number;               // Cost per million input tokens (USD)
    output: number;              // Cost per million output tokens (USD)
    cacheRead?: number;          // Cost per million cache read tokens
    cacheWrite?: number;         // Cost per million cache write tokens
  };
  contextWindow: number;         // Total context window size (tokens)
  maxTokens: number;             // Max output tokens
  compat?: Record<string, any>;  // Compatibility flags (see below)
  headers?: Record<string, string>; // Default headers
}
```

#### `Context`
```typescript
interface Context {
  systemPrompt?: string;         // System prompt
  messages: Message[];          // Conversation history
  tools?: Tool[];               // Available tools/functions
}

type Message = UserMessage | AssistantMessage | ToolResultMessage;

interface UserMessage {
  role: 'user';
  content: string | MessageContent[];
  timestamp: number;
}

interface AssistantMessage {
  role: 'assistant';
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: string;
  provider: string;
  model: string;
  usage: Usage;
  stopReason: StopReason;
  errorMessage?: string;
  timestamp: number;
  responseId?: string;
}

interface ToolResultMessage {
  role: 'toolResult';
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  isError: boolean;
  timestamp: number;
}

type MessageContent = TextContent | ImageContent | ThinkingContent;

interface TextContent { type: 'text'; text: string; }
interface ImageContent { type: 'image'; data: string; mimeType: string; }
interface ThinkingContent { type: 'thinking'; thinking: string; thinkingSignature?: string; }

interface ToolCall {
  type: 'toolCall';
  id: string;
  name: string;
  arguments: Record<string, any>;
  partialArgs?: string;
  thoughtSignature?: string; // Encrypted reasoning signature
}

interface Tool {
  name: string;
  description: string;
  parameters: any; // JSON Schema
}
```

#### `Usage`
```typescript
interface Usage {
  input: number;                 // Non-cached input tokens
  output: number;                // Output tokens (including reasoning)
  cacheRead: number;             // Cache hit tokens
  cacheWrite: number;            // Cache write tokens
  totalTokens: number;           // Total tokens processed
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}
```

#### `StopReason`
```typescript
type StopReason = 'stop' | 'length' | 'toolUse' | 'error' | 'aborted';
```

---

## 🌐 Supported Providers

| Provider | Models | API Type | Features |
|----------|--------|----------|----------|
| `openai` | 40 | OpenAI-compatible | GPT-5, GPT-4, o1, o3 |
| `anthropic` | 22 | OpenAI-compatible | Claude 3.7 Sonnet, thinking |
| `nvidia-nim` | 11 | OpenAI-compatible | Image, reasoning, fast inference |
| `openrouter` | 249 | OpenAI-compatible | 100+ providers auto-discovered |
| `vercel-ai-gateway` | 153 | OpenAI-compatible | Cached, cost-optimized |
| `google` | 27 | Google AI | Gemini 2.5 Pro, Flash |
| `groq` | 18 | OpenAI-compatible | Llama 4, ultra-fast |
| `cerebras` | 4 | OpenAI-compatible | Llama 4 Cerebras |
| `xai` | 24 | OpenAI-compatible | Grok 3 |
| `mistral` | 26 | Mistral API | Mistral Large, Codestral |
| `huggingface` | 20 | OpenAI-compatible | Photon, various OSS models |
| `zai` | 13 | OpenAI-compatible | Zcoder, Zreasoning |
| `opencode` | 32 | Anthropic-compatible | Claude Code variants |
| `github-copilot` | 24 | OpenAI-compatible | Claude, GPT for coding |
| `openai-codex` | 9 | OpenAI special | GPT-5 Codex |
| `google-gemini-cli` | 6 | Google Cloud Code | Cloud Code Assist |
| `google-antigravity` | 9 | Google special | Daily sandbox |
| `google-vertex` | 6 | Vertex AI | Enterprise GCP |
| `amazon-bedrock` | 87 | Bedrock Converse | Claude, Llama, Nova |
| `minimax` | 6 | Anthropic-compatible | Chinese models |
| `minimax-cn` | 6 | Anthropic-compatible | China endpoint |
| `kimi-coding` | 2 | Anthropic-compatible | Kimi for coding |

**Total: 801 models across 23 providers**

*Models auto-updated via `npm run generate-models` from models.dev, OpenRouter, Vercel AI Gateway APIs.*

---

## 🔧 Compatibility System

Different OpenAI-compatible providers have subtle differences. The `compat` field in `Model` handles these:

| Flag | Description |
|------|-------------|
| `supportsDeveloperRole: boolean` | Use `developer` role for system prompt (reasoning models) |
| `maxTokensField: "max_tokens" \| "max_completion_tokens"` | Which parameter name to use |
| `supportsUsageInStreaming: boolean` | Include usage in stream chunks |
| `supportsStrictMode: boolean` | Include `strict: false` in tool schemas |
| `thinkingFormat: "openai" \| "zai" \| "qwen" \| "openrouter"` | Reasoning field name & format |
| `requiresToolResultName: boolean` | Tool result needs `name` field (Anthropic) |
| `requiresAssistantAfterToolResult: boolean` | Insert assistant message after tool result |
| `requiresThinkingAsText: boolean` | Convert thinking blocks to text |
| `openRouterRouting: Record<string, string[]>` | Provider routing for OpenRouter |
| `vercelGatewayRouting: { only?, order? }` | Gateway routing for Vercel |

**Auto-detection:** Compat flags are auto-detected from provider name and URL. You can override in model config.

---

## 🛠️ Tool Calling

Full function calling support with streaming JSON parsing.

```typescript
// Define tools
const context = {
  messages: [{ role: 'user', content: 'What is the weather in Paris?', timestamp: Date.now() }],
  tools: [
    {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
        },
        required: ['location']
      }
    }
  ]
};

const stream = await stream(model, context);

for await (const event of stream) {
  if (event.type === 'toolcall_start') {
    const toolCall = event.partial?.content?.[event.contentIndex];
    console.log('Tool:', toolCall?.name);
  }
  if (event.type === 'toolcall_delta') {
    // Streaming JSON - can accumulate for UI
  }
  if (event.type === 'toolcall_end') {
    const toolCall = event.toolCall;
    console.log('Arguments:', toolCall.arguments); // Parsed JSON
  }
}

// Get final result
const final = await stream.result();

// Send tool result back
const toolCall = final.message.content.find(b => b.type === 'toolCall');
context.messages.push({
  role: 'assistant',
  content: [toolCall],
  api: model.api,
  provider: model.provider,
  model: model.id,
  usage: final.usage,
  stopReason: final.stopReason,
  timestamp: Date.now()
});

context.messages.push({
  role: 'toolResult',
  toolCallId: toolCall.id,
  toolName: toolCall.name,
  content: [{ type: 'text', text: '18°C, sunny' }],
  isError: false,
  timestamp: Date.now()
});

// Continue conversation...
const next = await stream(model, context);
```

---

## 🧠 Reasoning & Thinking

Support for Claude Sonnet 4, GPT-5, o1, Gemini 2.5 Pro thinking modes.

```typescript
const reasoningModel = getModel('openrouter', 'anthropic/claude-sonnet-4-5-thinking');

const stream = await stream(reasoningModel, context, {
  reasoningEffort: 'high'  // 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
});

for await (const event of stream) {
  if (event.type === 'thinking_start') {
    console.log('Model reasoning...');
  }
  if (event.type === 'thinking_delta') {
    process.stdout.write(event.delta); // Reasoning steps
  }
  if (event.type === 'text_delta') {
    console.log('\nAnswer:', event.delta);
  }
}
```

**Note:** Not all providers expose reasoning in streaming. Check `model.reasoning` and `compat.thinkingFormat`.

---

## 💰 Usage & Cost Tracking

Automatic token counting and cost calculation.

```typescript
const result = await stream(model, context).result();

console.log('Usage:', result.usage);
// {
//   input: 150,           // Input tokens (excluding cache hits)
//   output: 1200,         // Output tokens (includes reasoning)
//   cacheRead: 300,       // Cache hits
//   cacheWrite: 100,      // Cache writes
//   totalTokens: 1750,
//   cost: {
//     input: 0.00045,     // $0.45 / 1M tokens × 150
//     output: 0.00900,    // $9.00 / 1M tokens × 1200
//     cacheRead: 0.00003,
//     cacheWrite: 0.00010,
//     total: 0.00958
//   }
// }
```

Costs are calculated using model's `cost.input`, `cost.output`, `cost.cacheRead`, `cost.cacheWrite` (per million tokens).

---

## ⚙️ Advanced Features

### **Context Window Overflow (Auto-Truncate)**

Automatically truncates conversation history to fit model's context window.

```typescript
// No manual truncation needed - handled automatically
const longContext = {
  systemPrompt: '...',
  messages: [...1000 messages...]  // Exceeds context?
};

const stream = await stream(model, longContext); // auto-truncates
```

Strategy: Preserves system prompt, removes oldest messages first, keeps most recent user message.

---

### **Schema Validation (AJV)**

Tool parameters are validated before sending to API.

```typescript
// Invalid tool schema throws immediately
const badTool = {
  name: 'bad_tool',
  description: '...',
  parameters: { type: 'invalid' }  // Error: must be "object"
};

// Validation error:
// "Tool parameters must have type "object""
```

---

### **Request Deduplication (Hash Utilities)**

```typescript
import { requestFingerprint, cacheKey } from '@picro/llm';

// Generate cache key
const key = requestFingerprint(model.id, messages, { temperature: 0.7 });

// Simple cache key
const key2 = cacheKey(model.id, messages.length, options.temperature);
```

---

### **API Registry (Client Reuse)**

OpenAI clients are cached per model+apiKey for connection reuse.

```typescript
import { apiRegistry } from '@picro/llm';

// Get stats
console.log(apiRegistry.getStats());
// { totalClients: 3, clients: { ... } }

// Graceful shutdown (if needed)
await apiRegistry.closeAll();
```

---

### **onPayload Hook**

Modify request parameters before sending.

```typescript
const stream = await stream(model, context, {
  onPayload: async (params, model) => {
    // Log, modify, validate...
    console.log('Sending:', params);
    return params; // or return modified params
  }
});
```

---

## 📁 Project Structure

```
@picro/llm/
├── src/
│   ├── providers/
│   │   ├── index.ts              # Provider exports
│   │   ├── openai-compatible.ts  # Main provider implementation
│   │   └── register-builtins.ts  # Provider registration (pattern)
│   ├── utils/
│   │   ├── json-parse.ts         # Streaming JSON parser
│   │   ├── sanitize-unicode.ts   # Unicode sanitization
│   │   ├── validation.ts         # AJV schema validation
│   │   └── hash.ts               # Content hashing for caching
│   ├── env-api-keys.ts           # API key management
│   ├── overflow.ts               # Context truncation
│   ├── transform-messages.ts     # Message transformation
│   ├── compat-detection.ts       # Compatibility auto-detection
│   ├── api-registry.ts           # OpenAI client registry
│   ├── models.ts                 # Model lookup + cost calc
│   ├── models.generated.ts       # Auto-generated (801 models)
│   ├── types.ts                  # Type definitions
│   ├── event-stream.ts          # Event stream class
│   └── index.ts                  # Main entry point
├── scripts/
│   └── generate-models.ts        # Generate models from APIs
├── dist/                         # Compiled output
├── test-simple.ts                # Sanity check
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── LICENSE                       # MIT
└── README.md                     # This file
```

---

## 🔨 Development

```bash
# Clone & install
git clone <repo>
cd packages/llm
npm install

# Generate models (from APIs)
npm run generate-models

# Build
npm run build

# Watch mode
npm run dev

# Test
npm test

# Clean
npm run clean
```

### **Generating Models**

`npm run generate-models` fetches:
- models.dev API (Anthropic, Google, Groq, Cerebras, xAI, Mistral, HuggingFace, ZAI, OpenCode, GitHub Copilot, MiniMax, Kimi, Amazon Bedrock)
- OpenRouter API
- Vercel AI Gateway API
- Local config: `src/config/nvidia-nim.json`
- Static models (Codex, Grok, Vertex, etc.)

Edits `src/models.generated.ts` automatically. Commit this file for release.

---

## 📝 License

MIT - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

This library is **inspired by** the architecture of [`@mariozechner/pi-ai`](https://github.com/badlogic/pi-mono) but is a **complete rewrite** with original implementation.

All code in this repository is independently written and does not copy from pi-ai. We respect the pi-ai MIT license and have designed this extension to work alongside it, not as a derivative work.

---

**Made with ❤️ for AI developers**

**Questions?** Open an issue or contact: [@autoresearch](https://github.com/autoresearch)

---

## 🔗 Quick Links

- [Models.dev API](https://models.dev)
- [OpenRouter](https://openrouter.ai)
- [Vercel AI Gateway](https://vercel.com/docs/ai/ai-gateway)
- [NVIDIA NIM](https://integrate.api.nvidia.com)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

---

**Last updated:** 2025-04-16  
**Version:** 1.0.0  
**Models:** 801  
**Providers:** 23
