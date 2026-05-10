# AgentSession API Reference

## Overview

AgentSession là class chính để tương tác với AI agent. Nó encapsulate state, session persistence, compaction, retry, và tree navigation.

## Construction

```typescript
const session = new AgentSession({
  agent: Agent,
  sessionManager: SessionManager,
  settingsManager: SettingsManager,
  cwd: string,
  resourceLoader: ResourceLoader,
  modelRegistry: ModelRegistry,
  customTools?: ToolDefinition[],
  initialActiveToolNames?: string[],
  allowedToolNames?: string[],
  extensionRunner?: ExtensionRunner,
});
```

## Properties

### State Access

- `session.state` - Readonly agent runtime state
- `session.messages` - Array of all messages
- `session.model` - Current model
- `session.thinkingLevel` - Current thinking level
- `session.isStreaming` - Whether agent is currently running
- `session.systemPrompt` - Current effective system prompt
- `session.sessionFile` - Path to session file (if sessions enabled)
- `session.sessionId` - Current session ID

### Queue State

- `session.pendingMessageCount` - Number of queued messages (steering + followUp)
- `session.getSteeringMessages()` - Readonly array of pending steering messages
- `session.getFollowUpMessages()` - Readonly array of pending follow-up messages

### Compaction & Retry

- `session.isCompacting` - Whether compaction is running
- `session.autoCompactionEnabled` - Get/set auto-compaction
- `session.autoRetryEnabled` - Get/set auto-retry
- `session.retryAttempt` - Current retry attempt count

## Methods

### Prompting

```typescript
await session.prompt(text: string, options?: {
  expandPromptTemplates?: boolean;  // default true
  images?: ImageContent[];
  streamingBehavior?: "steer" | "followUp";  // required if streaming
  source?: InputSource;  // default "interactive"
})
```

- Sends a user prompt to the agent
- Handles extension commands, skill expansion, and template expansion
- If streaming, queues via `steer()` or `followUp()` based on `streamingBehavior`

```typescript
await session.steer(text: string, images?: ImageContent[])
```

- Queues a steering message (interrupts current turn, processed immediately)

```typescript
await session.followUp(text: string, images?: ImageContent[])
```

- Queues a follow-up message (processed after current turn finishes)

```typescript
await session.sendCustomMessage(message, options?: {
  triggerTurn?: boolean;
  deliverAs?: "steer" | "followUp" | "nextTurn";
})
```

- Sends a custom message (non-LLM context) with flexible delivery

```typescript
session.clearQueue(): { steering: string[]; followUp: string[] }
```

- Clears all queued messages and returns them

### Model & Thinking

```typescript
await session.setModel(model: Model)
```

- Sets the active model, updates session and settings

```typescript
await session.cycleModel(direction?: "forward" | "backward"): Promise<ModelCycleResult | undefined>
```

- Cycles to next/previous model (respects scoped models if set)

```typescript
session.setThinkingLevel(level: ThinkingLevel)
session.cycleThinkingLevel(): ThinkingLevel | undefined
```

- Manages thinking/reasoning level

### Session Management

```typescript
session.setSessionName(name: string)
```

- Sets display name for current session

```typescript
session.navigateTree(targetId: string, options?: {
  summarize?: boolean;
  customInstructions?: string;
  replaceInstructions?: boolean;
  label?: string;
}): Promise<{ editorText?: string; cancelled: boolean; aborted?: boolean; summaryEntry?: BranchSummaryEntry }>
```

- Navigates to a different node in the session tree
- Optionally summarizes the abandoned branch
- Returns `editorText` if navigating to a user message (for editor display)

```typescript
session.compact(): Promise<void>
```

- Manually triggers compaction (removes old context, creates summary)
- Respects current model's context window

```typescript
session.abort()
session.abortBash()
session.abortRetry()
```

- Abort operations

### Tool Management

```typescript
session.getActiveToolNames(): string[]
session.getAllTools(): ToolInfo[]
session.getToolDefinition(name: string): ToolDefinition | undefined
session.setActiveToolsByName(toolNames: string[])
```

- Query and manage available tools

### Extension System

```typescript
session.extensionRunner: ExtensionRunner
```

- Access extension runner for custom extensions

```typescript
session.hasExtensionHandlers(eventType: string): boolean
```

- Check if extensions listen to a specific event

### Events

Subscribe to events:

```typescript
const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
  switch (event.type) {
    case 'queue_update':
      // steering: string[], followUp: string[]
      break;
    case 'compaction_start':
    case 'compaction_end':
      // reason: 'manual' | 'threshold' | 'overflow'
      // result?: CompactionResult
      break;
    case 'auto_retry_start':
    case 'auto_retry_end':
      // attempt: number, maxAttempts: number, success?: boolean
      break;
    case 'session_tree':
      // newLeafId: string | null, oldLeafId: string, summaryEntry?: BranchSummaryEntry
      break;
    // ... plus all underlying agent events
  }
});
```

### Utilities

```typescript
session.getSessionStats(): SessionStats
session.exportToHtml(outputPath?: string): Promise<string>
session.exportToJsonl(outputPath?: string): string
```

## Types

### AgentSessionEvent

```typescript
type AgentSessionEvent =
  | AgentEvent
  | { type: 'queue_update'; steering: readonly string[]; followUp: readonly string[] }
  | { type: 'compaction_start'; reason: 'manual' | 'threshold' | 'overflow' }
  | { type: 'compaction_end'; reason: 'manual' | 'threshold' | 'overflow'; result?: CompactionResult; aborted: boolean; willRetry: boolean; errorMessage?: string }
  | { type: 'auto_retry_start'; attempt: number; maxAttempts: number; delayMs: number; errorMessage: string }
  | { type: 'auto_retry_end'; attempt: number; success: boolean; finalError?: string }
```

### CompactionSettings

```typescript
interface CompactionSettings {
  enabled: boolean;
  reserveTokens: number;     // Tokens to reserve for response (default 16384)
  keepRecentTokens: number;  // Keep at least these many recent tokens (default 20000)
}
```

### BuildSystemPromptOptions

```typescript
interface BuildSystemPromptOptions {
  customPrompt?: string;
  selectedTools?: string[];
  toolSnippets?: Record<string, string>;
  promptGuidelines?: string[];
  appendSystemPrompt?: string;
  cwd: string;
  contextFiles?: Array<{ path: string; content: string }>;
  skills?: Skill[];
}
```

## Notes

- All state access goes through `_agentState` getter/setter to accommodate different Agent implementations
- Session persistence handled by `SessionManager` (appendEntry, buildSessionContext)
- Automatic retry on transient errors (overloaded, rate limit, 5xx, timeout)
- Automatic compaction based on token usage or overflow errors
- Branch summarization uses LLM to create structured summaries when navigating tree
- Tool registry supports `promptSnippet` and `promptGuidelines` for system prompt customization

## Example Usage

```typescript
import { AgentSession } from './agent/agent-session';
import { SessionManager } from './session/session-manager';

// Create dependencies (simplified)
const session = new AgentSession({
  agent: new Agent(model, tools),
  sessionManager: new SessionManager(cwd, '.picro-agent'),
  settingsManager: new SettingsManager(),
  cwd: process.cwd(),
  resourceLoader: { /* ... */ },
  modelRegistry: { /* ... */ },
});

await session.prompt('Hello!');
const result = await session.navigateTree('entry-id', { summarize: true });
console.log('Navigated, editor text:', result.editorText);
```
