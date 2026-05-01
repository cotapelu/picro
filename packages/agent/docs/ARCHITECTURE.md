# Agent Package Architecture

## Overview

The `@picro/agent` package follows a **3-layer architecture**:

```
Layer 3: AgentSessionRuntime (Highest Level API)
    ↓ compose
Layer 2: AgentSession (Session Management)
    ↓ uses
Layer 1: Agent (Core - LLM + Tools)
```

**Dependency Rule:** Layer N can only import Layer < N. No circular dependencies.

---

## Layer 1: Agent (Core)

**Purpose:** Core agent functionality - LLM calls, tool execution, loop strategies.

**Files (10 files):**

| File | Purpose |
|------|---------|
| `agent.ts` | Main `Agent` class - orchestrates everything |
| `agent-types.ts` | Extended types for Agent |
| `agent-loop.ts` | `AgentLoop` - core execution loop (ReAct, PlanSolve, etc) |
| `tool-executor.ts` | `ToolExecutor` - executes tools with timeout/caching |
| `context-manager.ts` | `ContextBuilder` - builds LLM prompt from history |
| `loop-strategy.ts` | Loop strategies - determines when to continue |
| `message-queue.ts` | Steering/FollowUp queues |
| `event-emitter.ts` | Event emission |
| `events.ts` | Event types (message:start, tool:call:end, etc) |
| `types.ts` | Core types (ConversationTurn, ToolDefinition, etc) |

**Key Classes:**
- `Agent` - Main entry point
- `AgentLoop` - Handles the execution loop
- `ToolExecutor` - Executes tools
- `ContextBuilder` - Builds LLM context
- `EventEmitter` - Emits events

**External Dependency:** `@picro/llm` for LLM calls.

---

## Layer 2: AgentSession

**Purpose:** Session management - persistence, settings, resources, models.

**Files (10 files):**

| File | Purpose |
|------|---------|
| `agent-session.ts` | Main `AgentSession` class |
| `agent-session-types.ts` | Session event types |
| `session-manager.ts` | `SessionManager` - JSONL file persistence |
| `settings-manager.ts` | `SettingsManager` - file-based settings |
| `resource-loader.ts` | `ResourceLoader` - extensions/skills/themes |
| `model-registry.ts` | `ModelRegistry` - available models |
| `model-resolver.ts` | Model scope resolution |
| `compaction.ts` | Context compaction |
| `convert-to-llm.ts` | Convert session messages to LLM format |
| `output-guard.ts` | Sanitize tool output |

**Key Classes:**
- `AgentSession` - High-level session API
- `SessionManager` - Manages conversation history
- `SettingsManager` - Manages user settings
- `ResourceLoader` - Loads extensions, skills, prompts
- `ModelRegistry` - Registry of available models

---

## Layer 3: AgentSessionRuntime

**Purpose:** Highest-level API - composition root for entire system.

**Files (2 files):**

| File | Purpose |
|------|---------|
| `agent-session-runtime.ts` | Main `AgentSessionRuntime` class |
| `agent-session-services.ts` | `AgentSessionServices` - cwd-bound services |

**Key Classes:**
- `AgentSessionRuntime` - Entry point for apps
- `createAgentSessionRuntime()` - Factory function
- `AgentSessionServices` - Provides cwd-bound services

---

## Utilities (19 files)

Shared utilities used by all layers:

| File | Purpose |
|------|---------|
| `event-bus.ts` | Channel-based pub/sub |
| `auth-guidance.ts` | Auth error messages |
| `auth-storage.ts` | API key / OAuth storage |
| `cli-args.ts` | CLI argument parsing |
| `defaults.ts` | Default constants |
| `diagnostics.ts` | System information |
| `keybindings.ts` | Keybinding definitions |
| `package-manager.ts` | NPM package management |
| `prompt-templates.ts` | Load prompt templates |
| `proxy-stream.ts` | Proxy LLM through server |
| `resolve-config-value.ts` | Resolve config values |
| `skills.ts` | Skill loading |
| `slash-commands.ts` | Built-in commands |
| `source-info.ts` | Source tracking |
| `stream-utils.ts` | Async stream utilities |
| `system-prompt.ts` | System prompt builder |
| `telemetry.ts` | Anonymous usage tracking |
| `index.ts` | Public exports |

---

## Tools

Built-in tools in `tools/` directory:

| File | Purpose |
|------|---------|
| `bash.ts` | Bash tool |
| `read.ts` | File read tool |
| `write.ts` | File write tool |
| `edit.ts` | File edit tool |
| `ls.ts` | Directory listing |
| `find.ts` | File finding |
| `grep.ts` | Content search |
| `truncate.ts` | Output truncation |
| `file-mutation-queue.ts` | Batch file changes |

---

## Usage

### App uses AgentSessionRuntime (Layer 3):

```typescript
import { createAgentSessionRuntime } from '@picro/agent';

const runtime = await createAgentSessionRuntime(
  async (options) => {
    // Create services
    const services = await createAgentSessionServices({
      cwd: options.cwd,
      agentDir: options.agentDir,
    });
    return {
      session: await createAgentSessionFromServices({ services }),
      services,
      diagnostics: [],
    };
  },
  { cwd: process.cwd(), agentDir: '~/.pi/agent' }
);

// Subscribe to events
runtime.subscribe((event) => {
  switch (event.type) {
    case 'message:end':
      console.log('Message:', event.turn?.content);
      break;
    case 'tool:call:end':
      console.log('Tool result:', event.result);
      break;
  }
});

// Session manages Agent (Layer 2 → Layer 1)
// App only interacts with runtime
```

---

## Event Flow

```
App → AgentSessionRuntime.subscribe()
  ↓
AgentSession → emit events (message:start, tool:call:end, etc)
  ↓
Agent → emits events (agent:start, agent:end, etc)
  ↓
EventEmitter → notify subscribers
```

---

## Summary

- **Layer 1 (Agent):** Core - LLM + tools + loop
- **Layer 2 (AgentSession):** Session - persistence + settings + resources
- **Layer 3 (AgentSessionRuntime):** Composition root - puts everything together
- **Tools:** Built-in tools (bash, read, write, etc)
- **Utilities:** Shared helpers

All 42 files organized into clear layers with no circular dependencies.
