# Agent Package Layer Architecture

## Overview

The `@picro/agent` package is organized into **3 layers**, where each layer can only import from itself or layers below it.

## Layer Diagram

```
┌─────────────────────────────────────────────────┐
│  LAYER 3: INTERACTIVE                       │
│  User-facing APIs, CLI, Settings              │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  LAYER 2: SESSION                             │
│  Session management, Settings                │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  LAYER 1: CORE                                 │
│  Types, Events, Agent class, Tool Execution    │
└─────────────────────────────────────────────────┘
```

## Dependency Rule

- Layer N can only import from Layer 1 to N-1
- Layer N cannot import from Layer N+1

---

## Layer 1: CORE

Foundation layer - contains types, events, and the main Agent class.

### Files (19 files)

| File | Description |
|------|-------------|
| `types.ts` | Core types (ContentBlock, ConversationTurn, ToolDefinition...) |
| `agent-types.ts` | Extended types (ThinkingLevel, AgentState) |
| `events.ts` | Event definitions (AgentStartEvent, AgentEndEvent...) |
| `event-emitter.ts` | EventEmitter with typed handlers |
| `event-bus.ts` | EventBus - channel-based pub/sub |
| `event-guards.ts` | Type guards for events |
| `event-recorder.ts` | Record events to storage |
| `prioritized-event-emitter.ts` | Priority-based event emission |
| `tool-executor.ts` | Tool registration & execution with timeout/cache |
| `agent-loop.ts` | Core execution loop (run/stream) |
| `agent.ts` | Main Agent class - creates AgentLoop, ToolExecutor |
| `context-manager.ts` | ContextBuilder - prompt building |
| `loop-strategy.ts` | Loop strategies (ReAct, PlanSolve...) |
| `message-queue.ts` | Message queue (circular buffer) |
| `convert-to-llm.ts` | Convert session to LLM format |
| `proxy-stream.ts` | Proxy LLM through server |
| `defaults.ts` | Default constants |
| `truncate.ts` | Truncation utilities |
| `model-registry.ts` | Model registry |

### External Dependencies

- `@picro/llm` - LLM interfaces
- `node:crypto`, `node:fs`, `node:path` - Node.js built-ins

---

## Layer 2: SESSION

Session management and settings (higher-level than core).

### Files (7 files)

| File | Description |
|------|-------------|
| `agent-session.ts` | AgentSession class - manages agent lifecycle |
| `agent-session-runtime.ts` | Runtime session |
| `agent-session-services.ts` | Session services |
| `agent-session-types.ts` | Session types |
| `session-manager.ts` | Session persistence (JSONL format) |
| `settings-manager.ts` | Settings manager (global/project scope) |
| `settings-validator.ts` | Settings validation |

### Dependencies

- Imports from Layer 1
- Example: `session-manager.ts` imports `convert-to-llm.ts` from Layer 1
- Example: `agent-session.ts` imports `agent.ts` from Layer 1

---

## Layer 3: INTERACTIVE

User-facing APIs, CLI, resources loading, diagnostics.

### Files (27 files)

| File | Description |
|------|-------------|
| `cli-args.ts` | CLI argument parsing |
| `diagnostics.ts` | System diagnostics |
| `auth-storage.ts` | Auth storage (API keys, OAuth) |
| `auth-guidance.ts` | Auth guidance messages |
| `resource-loader.ts` | ResourceLoader - load extensions/skills/prompts |
| `package-manager.ts` | Package manager (npm) |
| `skills.ts` | Load SKILL.md |
| `prompt-templates.ts` | Load .md templates |
| `telemetry.ts` | Telemetry (opt-in) |
| `output-guard.ts` | Sanitize/validate output |
| `performance-tracker.ts` | Performance tracking |
| `footer-data-provider.ts` | Footer data provider |
| `keybindings.ts` | Keybindings manager |
| `slash-commands.ts` | Built-in slash commands |
| `system-prompt.ts` | System prompt builder |
| `file-mutation-queue.ts` | File mutation queue |
| `resolve-config-value.ts` | Resolve config values |
| `source-info.ts` | Source information |
| `stream-utils.ts` | Stream utilities |
| `model-resolver.ts` | Model resolver |
| `compaction.ts` | Compaction entry |
| `compaction/core.ts` | Compaction core logic |
| `compaction/compaction.ts` | Compaction functions |
| `compaction/utils.ts` | Compaction utilities |
| `compaction/branch-summarization.ts` | Branch summarization |
| `compaction/index.ts` | Compaction barrel export |
| `index.ts` | Barrel export |

---

## Import Rules

### Allowed

```typescript
// Within same layer
import { Something } from './events.js';          // Layer 1 → Layer 1
import { Something } from '../session/agent-session.js';  // Layer 2 → Layer 1

// From external
import { Model } from '@picro/llm';
import { readFile } from 'node:fs';
```

### Not Allowed

```typescript
// Layer 2 cannot import from Layer 3
import { Settings } from './settings-manager.js';  // ❌ Cannot import Layer 3 from Layer 2
```

---

## Migration Notes

When adding new files:

1. Determine which layer the file belongs to
2. Check its imports - must be from same layer or layers below
3. Update this document

### Quick Layer Check

| Question | Answer | Layer |
|----------|--------|-------|
| Is it the Agent class or core executor? | Yes | 1 |
| Manages session/settings? | Yes | 2 |
| User-facing/CLI/resource? | Yes | 3 |