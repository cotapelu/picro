# pi-micro Architecture

## Overview

pi-micro is a monorepo consisting of several focused packages that together form an AI coding assistant with terminal UI.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         coding-agent (app)                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ main.ts (CLI)                                                │  │
│  │ tui-app.ts (ChatUI, panels, input handling)                 │  │
│  │ llm-adapter.ts (adapts @picro/llm to agent LLMInstance)      │  │
│  │ tools/ (file, code, command, search, git)                   │  │
│  │ memory-store-adapter.ts (bridges memory)                    │  │
│  │ config/ (settings, validation)                              │  │
│  │ debug.ts (metrics collector)                                │  │
│  │ search/bm25.ts (ranking)                                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────┐ ┌─────────┐ ┌─────────────┐ ┌──────────┐
│  @picro/    │ │ @picro/ │ │  @picro/    │ │ @picro/  │
│   agent     │ │  llm    │ │  memory     │ │   tui    │
│             │ │         │ │             │ │          │
│ • BaseAgent │ │ • 25+   │ │ • Storage   │ │ • UI     │
│ • ToolExec  │ │   providers│ • Retrieval  │ │ • Components
│ • Context   │ │ • Models│ │ • Engine     │ │ • Terminal
│ • Events    │ │ • Stream│ │ • Scoring    │ │ • Layout │
└─────────────┘ └─────────┘ └─────────────┘ └──────────┘
```

## Package Breakdown

### `@picro/agent` (Core)
- **BaseAgent**: Orchestration of LLM, tools, context
- **ToolExecutor**: Safe tool execution with timeout, caching, hooks
- **ContextManager**: Token budgeting, memory injection, truncation
- **Strategies**: ReAct, PlanAndSolve, Reflection, Simple, SelfRefine
- **Events**: Observability via EventEmitter
- **Types**: Full TypeScript definitions

### `@picro/llm` (LLM Abstraction)
- Unified API over 25+ providers (OpenAI, Anthropic, Google, NVIDIA, etc.)
- 1100+ models catalog with compatibility flags
- Streaming and non-streaming support
- Automatic retries, error mapping
- Provider-specific adapters

### `@picro/memory` (Memory System)
- **MemoryStore**: JSON file persistence (gzip)
- **MemoryEngine**: High-level operations (add, recall, forgetting)
- **MemoryRetriever**: Keyword, fuzzy, BM25 scoring, cache with TTL
- **MemoryScorer**: Sophisticated scoring (synonyms, recency, file path)
- **AgentMemoryApp**: Agent-friendly wrapper (file read/edit, command, project info)

### `@picro/tui` (Terminal UI)
- **TerminalUI**: Main orchestrator (input, rendering, focus)
- **Components**: Text, Box, Markdown, SelectList, SettingsList, BorderedLoader
- **Utils**: visibleWidth, wrapText, truncateText, ANSI handling
- **Event System**: Key handlers, focus management

### `coding-agent` (Application)
The actual application entry point (`picro` command). Ties everything together:

1. **CLI** (`main.ts`): Commands (run, interactive, config)
2. **TUI** (`tui-app.ts`):
   - ChatUI: message list, input, status, panels
   - Panels: help, memory, debug, settings, sessions
   - Key handling (scroll, history, palette)
3. **Tools**: File, code, command, search, git operations
4. **Config**: Persistent settings, validation, provider management
5. **Debug**: Metrics collection (latency, tokens, tool times)
6. **Search**: BM25 ranking for message history

## Data Flow

```
User Input (TUI)
    │
    ▼
BaseAgent.run(prompt)
    │
    ├─► Retrieve Memories (MemoryEngine.recall)
    │   └─► Cache hit? → Return cached
    │   └─► Cache miss → Score & return (BM25)
    │
    ├─► Build Context (ContextManager)
    │   ├─ Truncate history to token limit
    │   ├─ Inject memories (if any)
    │   └─ Estimate token count
    │
    ├─► Call LLM (LLMInstance.chatWithTools)
    │   ├─ Apply retry with exponential backoff on network errors
    │   └─ Stream or blocking response
    │
    ├─► Tool Calls?
    │   ├─ Yes: Execute via ToolExecutor
    │   │   ├─ Before hooks (can block)
    │   │   ├─ Timeout protection
    │   │   ├─ Progress callbacks → UI
    │   │   └─ After hooks (can override)
    │   │
    │   └─ Append results → next round
    │
    └─► Final Answer
        └─► Display in TUI
```

## Configuration

- Location: `~/.picro/agent/config.json`
- Validated on load; invalid fields auto-fixed with defaults
- Settings: maxRounds, maxContextTokens, toolTimeout, logging, strategy, memory, debugMode
- Providers: baseUrl, api (provider type), apiKey, authHeader, models
- Projects: name, path, createdAt, lastUsed

## Memory Architecture

- **Storage**: Compressed JSON (gzip) in `.coding-agent/memory.json`
- **Hashing**: SHA-256 of content+metadata → deduplication
- **Retrieval**:
  1. Prefilter by metadata (filePath, action synonyms)
  2. Exact keyword match (with synonyms)
  3. Fuzzy partial match (fallback)
  4. BM25 scoring (k1=1.2, b=0.75) with recency/access boost
  5. Adaptive thresholds (relax if no results)
- **Cache**: In-memory LRU-ish with TTL (default 5min)

## TUI Rendering Pipeline

1. **Input**: Key events → ChatUI.handleKey()
2. **Update**: State changes → tui.requestRender()
3. **Render**: Each UIElement.draw(context) → string lines
4. **Write**: TerminalUI writes lines to stdout (ANSI codes)
5. **Refresh**: Kitty protocol or full clear on resize

## Error Handling Strategy

- **Network errors**: Detected by common error codes, retry up to 3 times with exponential backoff.
- **Tool errors**: Caught by ToolExecutor, reported with ❌ icon, `R` to retry.
- **LLM errors**: Propagated to agent, user can retry.
- **Config errors**: Validated, auto-fixed, fallback to defaults.
- **User-friendly messages**: Common FS errors (ENOENT, EACCES) translated to actionable hints.

## Extensibility

- **New LLM provider**: Implement in `@picro/llm` (or use OpenAI-compatible endpoint)
- **New tool**: Extend `BaseAgent` with ToolDefinition; register.
- **Custom strategy**: Implement LoopStrategy interface.
- **Memory backend**: Implement MemoryStore interface.
- **TUI component**: Implement UIElement, add to ChatUI.

## Testing Strategy

- Unit tests for pure functions (BM25, validation)
- Unit tests for isolated classes (InputBox, DebugCollector)
- Integration tests for tool execution (tool-executor.test.ts)
- E2E tests for simple flows (debug toggle)
- Coverage target: 80% (critical paths)

---

Last updated: 2026-04-23
