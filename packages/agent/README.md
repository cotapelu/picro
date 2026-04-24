# @picro/agent

**Professional Agent Core Library** - A production-ready framework for building AI agents with tool calling capabilities.

> **Note:** This is the **core library** package. For a complete application built on this library, see [`packages/coding-agent`](../coding-agent/).

## 🌟 Features

- **5 Loop Strategies**: ReAct, Plan & Solve, Reflection, Simple, Self-Refine
- **Full Observability**: Event system with console + file logging
- **Safe Execution**: Timeout protection, error boundaries, result caching
- **Context Management**: Token counting, automatic truncation, memory injection
- **Extensible Architecture**: Clean separation between core logic and application
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## 📦 Installation

```bash
npm install @picro/agent
```

## 🆕 What's New (v0.0.1)

- **Streaming Responses**: Real-time token-by-token streaming with `agent.stream()`
- **Tool Hooks**: `beforeToolCall` (block) and `afterToolCall` (override)
- **Tool Progress**: Long-running tools can send progress updates
- **Steering & Follow-up Queues**: Interruptible agents with message queuing
- **Proxy Support**: Stream through a proxy server for browser apps
- **Session & Thinking Budgets**: Provider caching and reasoning level control
- **Abort Control**: Cancel operations with AbortSignal
- **Context Flexibility**: Custom `transformContext` hook for advanced memory

## 🚀 Quick Start

```typescript
import { BaseAgent, ReActStrategy } from '@picro/agent';

// Define your tools
const tools = [
  {
    name: 'search',
    description: 'Search for information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    },
    handler: async (args) => {
      // Your implementation
      return `Results for: ${args.query}`;
    }
  }
];

// Create LLM instance (implement LLMInstance interface)
const llm = {
  async chatWithTools(prompt, tools) {
    // Call your LLM provider
    // Return LLMResponse with content and/or toolCalls
  },
  async chat(prompt) {
    // Simple chat without tools
  },
  getModel() {
    return 'your-model-name';
  }
};

// Create and run agent
const agent = new BaseAgent(llm, tools, {
  maxRounds: 10,
  strategy: new ReActStrategy(),
  verbose: true
});

const result = await agent.run('Your prompt here');
console.log(result.finalAnswer);
```

## 🎯 Loop Strategies

### 1. ReAct (Reason + Act)
Standard approach: Think → Act → Observe → Repeat
```typescript
import { ReActStrategy } from '@picro/agent';
const agent = new BaseAgent(llm, tools, { strategy: new ReActStrategy() });
```

### 2. Plan & Solve
Create a plan first, then execute step by step
```typescript
import { PlanAndSolveStrategy } from '@picro/agent';
const agent = new BaseAgent(llm, tools, { strategy: new PlanAndSolveStrategy() });
```

### 3. Reflection
Self-critique results before final answer
```typescript
import { ReflectionStrategy } from '@picro/agent';
const agent = new BaseAgent(llm, tools, { strategy: new ReflectionStrategy() });
```

### 4. Self-Refine
Iteratively evaluate and improve results (3 phases: Initial → Refine → Final)
```typescript
import { SelfRefineStrategy } from '@picro/agent';
const agent = new BaseAgent(llm, tools, { 
  strategy: new SelfRefineStrategy(),
  maxRounds: 15 
});
```

### 5. Simple
No special behavior, just execute until LLM stops
```typescript
import { SimpleStrategy } from '@picro/agent';
const agent = new BaseAgent(llm, tools, { strategy: new SimpleStrategy() });
```

## 📊 Event System

Subscribe to agent events for logging, monitoring, and debugging:

```typescript
import { createConsoleLogger } from '@picro/agent';

const logger = createConsoleLogger(true); // Enable verbose logging

// Subscribe to specific events
logger.on('tool:call', (event) => {
  console.log(`Tool called: ${event.metadata.toolName}`);
});

logger.on('tool:result', (event) => {
  console.log(`Tool result: ${event.metadata.toolName}`);
});

logger.on('error', (event) => {
  console.error(`Error: ${event.error}`);
});
```

### Available Events
- `agent:start` - Agent execution started
- `agent:end` - Agent execution completed
- `round:start` - New round starting
- `round:end` - Round completed
- `llm:request` - LLM API call made
- `llm:response` - LLM response received
- `tool:call` - Tool execution started
- `tool:result` - Tool execution completed
- `tool:update` - Tool progress update
- `tool:error` - Tool execution failed
- `error` - General error occurred

## ⚡ Streaming Responses

The agent supports real-time streaming of LLM responses via `agent.stream()`:

```typescript
const agent = new BaseAgent(llm, tools);

for await (const chunk of agent.stream('Hello!')) {
  if (chunk.type === 'text_delta') {
    process.stdout.write(chunk.delta);
  } else if (chunk.type === 'done') {
    console.log('\nDone');
  }
}
```

If your LLM provider doesn't support streaming, the agent will emulate it by chunking the blocking response.

## 🔧 Tool Execution

### Safe Execution Features
- **Timeout Protection**: Tools timeout after 30s (configurable)
- **Error Boundaries**: One tool failure doesn't crash the agent
- **Result Caching**: Optional caching to avoid redundant calls
- **Concurrent Execution**: Multiple tools can run in parallel

```typescript
const executor = new ToolExecutor({
  timeout: 60000, // 60 seconds
  cacheEnabled: true,
  emitter: logger
});

executor.registerTool({
  name: 'myTool',
  description: 'My custom tool',
  handler: async (args, context) => {
    // Your implementation
    return 'result';
  }
});

const result = await executor.execute({
  id: 'call_123',
  name: 'myTool',
  arguments: { param: 'value' }
});
```

### Tool Hooks

Intercept tool execution with `beforeToolCall` (can block) and `afterToolCall` (can override result):

```typescript
const executor = new ToolExecutor({
  beforeToolCall: async ({ toolCall, args, round }) => {
    if (toolCall.name === 'dangerous') {
      return { block: true, reason: 'Not allowed' };
    }
  },
  afterToolCall: async ({ toolCall, result, round }) => {
    return { content: `[Audited] ${result.result}` };
  }
});
```

### Tool Progress

Tools can send progress updates via `onProgress` callback:

```typescript
handler: async (args, context, onProgress) => {
  for (let i = 0; i < 10; i++) {
    await delay(1000);
    onProgress?.({ partialResult: `Step ${i+1}/10` });
  }
  return 'Done';
}
```

## 🧠 Context Management

Automatically manage context window limits:

```typescript
import { ContextManager } from '@picro/agent';

const contextManager = new ContextManager({
  maxTokens: 128000,
  reservedTokens: 4096,
  minMessages: 5
});

// Truncate messages if needed
const truncated = contextManager.truncateMessages(messages);

// Inject relevant memories
const prompt = contextManager.injectMemories(basePrompt, query);

// Get context statistics
const stats = contextManager.getStats(messages);
console.log(`Tokens used: ${stats.totalTokens}/${stats.maxTokens}`);
```

## 📝 Configuration

```typescript
interface BaseAgentConfig {
  maxRounds?: number;          // Maximum conversation rounds (default: 10)
  verbose?: boolean;           // Enable verbose logging (default: false)
  maxContextTokens?: number;   // Maximum tokens in context (default: 128000)
  reservedTokens?: number;     // Reserve tokens for new messages (default: 4096)
  minMessages?: number;        // Keep at least N messages (default: 5)
  toolTimeout?: number;        // Tool execution timeout in ms (default: 30000)
  cacheResults?: boolean;      // Enable result caching (default: false)
  enableLogging?: boolean;     // Enable console logging (default: true)
  strategy?: LoopStrategy;     // Loop strategy (default: ReActStrategy)
}
```

## 🎮 Steering & Follow-up Queues

Interrupt an agent while it's running or queue messages for after it finishes:

```typescript
// While agent is running, steer it in a new direction
agent.steer({ role: 'user', content: 'Change plan!' });

// Queue a follow-up that runs after the agent stops
agent.followUp({ role: 'user', content: 'Also summarize' });

// Configure queue behavior
const agent = new BaseAgent(llm, tools, {
  steeringMode: 'one-at-a-time', // or 'all'
  followUpMode: 'one-at-a-time'
});
```

## 🌐 Proxy Streaming

For browser apps that need to route LLM calls through a backend proxy:

```typescript
import { createProxyStream } from '@picro/agent';

const llm = {
  async *streamWithTools(prompt, tools, callbacks, options) {
    return createProxyStream(model, context, {
      authToken: await getAuthToken(),
      proxyUrl: 'https://your-server.com/api/stream',
      signal: options?.signal
    });
  }
};
```

## 💾 Session & Thinking Budgets

Provider caching and reasoning control for token-based models:

```typescript
const agent = new BaseAgent(llm, tools, {
  sessionId: 'user-123-session', // Cache-aware providers
  reasoningLevel: 'medium', // 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
  // thinkingBudgets mapping can be provided if provider needs explicit token count
});
```

## ⛔ Abort Control

Cancel long-running operations:

```typescript
const controller = new AbortController();

// Start agent with signal
agent.run('long task', controller.signal);

// Or abort later
setTimeout(() => controller.abort(), 5000);

agent.on('error', (event) => {
  if (event.error.includes('aborted')) {
    console.log('Task cancelled');
  }
});
```

## 🔄 Context Flexibility

Inject custom context transformation before each LLM call:

```typescript
const agent = new BaseAgent(llm, tools, {
  transformContext: async (messages, signal) => {
    // RAG: inject relevant memories
    const memories = await fetchRelevant(messages);
    return [...memories, ...messages];
  }
});
```

## 🏗️ Architecture
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│  (coding-agent, research-agent, etc.)                   │
│  • Implement LLMInstance interface                       │
│  • Define tools with handlers                            │
│  • Parse LLM responses                                   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              @picro/agent (Core)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ BaseAgent                                          │  │
│  │ • Orchestrate loop                                 │  │
│  │ • Manage state                                     │  │
│  │ • Execute strategy                                 │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐  │
│  │ Tool       │ │ Context    │ │ Event              │  │
│  │ Executor   │ │ Manager    │ │ System             │  │
│  └────────────┘ └────────────┘ └────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Strategies: ReAct, Plan& Solve, Reflection, etc.  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 📈 Performance

### Benchmarks (Memory System Test)
- **Memories Added**: 69 → 199 (+188%)
- **Tool Calls**: 77 → 201 (+161%)
- **Rounds**: 10 → 15 (+50%)
- **Score**: 75/100

### Resource Usage
- **Core Library**: ~2,500 lines of TypeScript
- **Memory Footprint**: Minimal (event-based)
- **Latency**: <10ms per tool execution (excluding LLM)

## 🧪 Testing

```typescript
import { BaseAgent, SimpleStrategy } from '@picro/agent';

// Mock LLM for testing
const mockLLM = {
  async chatWithTools(prompt, tools) {
    return {
      content: 'Final answer',
      toolCalls: []
    };
  },
  async chat(prompt) {
    return 'Answer';
  },
  getModel() {
    return 'test-model';
  }
};

const agent = new BaseAgent(mockLLM, tools, {
  maxRounds: 5,
  strategy: new SimpleStrategy()
});

const result = await agent.run('Test prompt');
console.log(result.success); // true
console.log(result.totalRounds); // 1
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with TypeScript
- Inspired by ReAct paper
- Event system based on Node.js EventEmitter pattern

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation
- Review example applications

---

**Version**: 0.0.1  
**Last Updated**: 2026-04-16  
**Status**: Production Ready ✅
