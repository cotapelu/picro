# @picro/agent

Core Agent Library - Build AI agents with tool execution capabilities.

## Features

- 🤖 **Agent Session Management** - Create, manage, persist agent sessions
- 🔧 **Tool Execution** - Pluggable tool system with streaming & truncation
- 🛡️ **Security** - Output sanitization, binary detection, size limits
- 📊 **Telemetry** - Rate-limited usage tracking (opt-in)
- 🐛 **Diagnostics** - System, memory, performance metrics
- ⚙️ **Configuration** - Resolve from env vars, shell commands, or literals
- 📦 **Package Manager** - Install and load extension packages
- 🔄 **Compaction** - Automatic context compression
- 🛠️ **Built-in Tools** - bash, read, write, edit, ls

## Installation

```bash
npm install @picro/agent
```

## Quick Start

There are two main entry points depending on your use case:

### Option 1: High-Level API (Recommended)

Use `AgentSessionRuntime` - the highest-level API that manages everything for you:

```typescript
import { createAgentSessionRuntime } from '@picro/agent';

const runtime = await createAgentSessionRuntime({
  cwd: process.cwd(),
  agentDir: './.pi/agent',
  model: 'claude-3.5-sonnet',
  thinkingLevel: 'medium',
});

const result = await runtime.session.prompt('Help me refactor this code');
console.log(result.content);

await runtime.dispose();
```

### Option 2: Direct Session Control

Use `AgentSession` directly when you need fine-grained control:

```typescript
import { AgentSession } from '@picro/agent';

const session = new AgentSession({
  cwd: process.cwd(),
  agent: myAgent,           // pre-created Agent instance
  sessionManager: myManager,
  settingsManager: mySettings,
  resourceLoader: myLoader,
  modelRegistry: myRegistry,
});

const result = await session.prompt('Help me refactor this code');
console.log(result.content);
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   AgentSessionRuntime                       │
│                   (ROOT / TOP LEVEL)                        │
│  - Small wrapper (332 lines)                                │
│  - Creates and owns: AgentSession + AgentSessionServices   │
│  - Entry point: createAgentSessionRuntime()                │
└───────────────────────┬─────────────────────────────────────┘
                        │ contains
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐             ┌────────▼─────────┐
│ AgentSession   │             │AgentSessionServices│
│ (GIANT CLASS)  │             │  (Service Container)│
│ - 1,713 lines  │             │  - 5 core services │
│ - Orchestrator │             │  - Auth, Settings, │
│ - 10+ deps     │             │    Model, Loader   │
└───────┬────────┘             └────────┬──────────┘
        │ contains                       │ contains
        │    ┌───────────┐              ┌┴──────────────┐
        └────►  Agent    ◄──────────────┤  SessionMgr   │
             │ (545 lines)│              │SettingsMgr    │
             └─────┬──────┘              │ModelRegistry  │
                   │ contains            │ResourceLoader │
            ┌──────▼───────┐              └───────────────┘
            │  AgentLoop   │
            │ (1,209 lines)│
            │ - Execution  │
            │   Engine     │
            └──────┬───────┘
                   │ uses
         ┌─────────┴──────────┐
         ▼                    ▼
    ToolExecutor        ContextBuilder
   (471 lines)          (core logic)
```

### Class Size Comparison

| Class | Lines | Role | Dependencies |
|-------|-------|------|--------------|
| **AgentSession** | **1,713** | **Main orchestrator** | ~10 (Agent, SessionManager, SettingsManager, ResourceLoader, ModelRegistry, EventEmitter, ExtensionRunner, PerformanceTracker, ToolRegistry) |
| AgentLoop | 1,209 | Execution engine | ~8 (ToolExecutor, ContextBuilder, Strategy, Config, Emitter, State, MemoryStore) |
| SessionManager | 660 | Session persistence | ~0 (mostly internal state) |
| SettingsManager | 617 | Settings storage | ~2 (File/InMemory storage) |
| Agent | 514 | Core agent logic | ~6 (ToolExecutor, ContextBuilder, EventEmitter, Config, State, MessageQueue) |
| AgentSessionRuntime | **332** | **Root/Entry point** | 3 (AgentSession, AgentSessionServices, cwd) |
| AgentSessionServices | ~200 | Service container | 5 (Auth, Settings, ModelRegistry, ResourceLoader, ExtensionRunner) |

### Dependency Hierarchy

```
AgentSessionRuntime (root)
  └── AgentSession (orchestrator)
       ├── Agent (execution)
       │    └── AgentLoop (loop engine)
       │         ├── ToolExecutor
       │         ├── ContextBuilder
       │         └── LoopStrategy implementations
       ├── SessionManager (persistence)
       ├── SettingsManager (config)
       ├── ResourceLoader (file loading)
       ├── ModelRegistry (model management)
       ├── ExtensionRunner (extensions)
       └── EventEmitter (events)
```

## Core Concepts

### Entry Points

#### 1. AgentSessionRuntime (High-Level)

The recommended entry point for most applications. It:
- Creates all necessary services automatically
- Manages cwd-bound services
- Handles session file management
- Provides clean lifecycle (switchSession, newSession, fork, dispose)

**When to use:** You want a complete, production-ready setup with minimal configuration.

```typescript
import { createAgentSessionRuntime } from '@picro/agent';

const runtime = await createAgentSessionRuntime({
  cwd: process.cwd(),
  agentDir: './.pi/agent',
  sessionManager?: customSessionManager, // optional override
  model: 'claude-3.5-sonnet',
  thinkingLevel: 'medium',
  tools: ['bash', 'read', 'write', 'edit'],
});

await runtime.session.prompt('What files are in this directory?');
await runtime.newSession(); // create new session
await runtime.fork('entry-123'); // branch at entry
await runtime.dispose();
```

#### 2. AgentSession (Mid-Level)

The main session class for direct control. Requires you to provide all dependencies manually.

**When to use:** You need custom injection of dependencies, testing, or specialized setup.

```typescript
import { AgentSession } from '@picro/agent';
import { SessionManager } from '@picro/agent';
import { SettingsManager } from '@picro/agent';

const sessionManager = SessionManager.open('./session.jsonl', './sessions', process.cwd());
const settingsManager = SettingsManager.create(process.cwd(), './.pi/agent');
const resourceLoader = new DefaultResourceLoader({ cwd: process.cwd(), agentDir: './.pi/agent' });
const modelRegistry = new DefaultModelRegistry();
const agent = new Agent(/* config */);

const session = new AgentSession({
  cwd: process.cwd(),
  agent,
  sessionManager,
  settingsManager,
  resourceLoader,
  modelRegistry,
});

await session.prompt('Hello');
```

### AgentSession

The main class for agent interaction. It's a **facade/orchestrator** that coordinates all subsystems:

```typescript
interface AgentSessionConfig {
  cwd: string;
  agent: Agent;
  sessionManager: SessionManager;
  settingsManager: SettingsManager;
  resourceLoader: ResourceLoader;
  modelRegistry: ModelRegistry;
  initialActiveToolNames?: string[];
  allowedToolNames?: string[];
  maxSteeringQueueSize?: number;
  maxFollowUpQueueSize?: number;
  enablePerformanceTracking?: boolean;
}

class AgentSession {
  // Primary API - Send a prompt
  prompt(message: string | object): Promise<AgentResponse> {}

  // Model management
  setModel(model: string): Promise<void> {}
  cycleModel(): void {}
  setThinkingLevel(level: ThinkingLevel): void {}

  // Session persistence
  saveSession(label?: string): void {}
  loadSession(id: string): void {}
  getSessions(): SessionInfo[] {}
  newSession(): string | undefined {}
  fork(entryId: string): void {}

  // Compaction & memory
  compact(): Promise<CompactionResult> {}
  getContextTokens(): number {}
  allowAutoCompaction(enabled: boolean): void {}

  // Tool management
  registerTool(tool: ToolDefinition): void {}
  unregisterTool(name: string): void {}
  setActiveTools(names: string[]): void {}

  // State access
  get state(): AgentRuntimeState {}
  get messages(): ConversationTurn[] {}
  get isStreaming(): boolean {}
  get sessionId(): string {}
  get sessionName(): string | undefined {}

  // Events
  onEvent(event: AgentEvent, handler: (e: any) => void): () => void {}
}
```

### Tools

Tools are functions the agent can call:

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  schema: any; // Validation schema (e.g., typebox)
  execute(input: any, context: ToolContext): Promise<ToolResult>;
}
```

Register custom tools:

```typescript
session.registerTool({
  name: 'my-tool',
  description: 'Does something useful',
  schema: { type: 'object', properties: { arg: { type: 'string' } } },
  async execute(input, context) {
    return { success: true, result: `You passed: ${input.arg}` };
  },
});
```

### Built-in Tools

Factory functions create properly configured tool definitions:

```typescript
import {
  createBashToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
  createEditToolDefinition,
  createLsToolDefinition,
} from '@picro/agent';

// Tools are already registered by default in AgentSession
// Use these factories only for custom configurations
const bashTool = createBashToolDefinition({
  timeout: 10000,
  truncateOutput: { maxBytes: 1024 * 1024 },
});
```

Available built-in tools:
- **bash** - Execute shell commands with timeout & truncation
- **read** - Read file contents (with size/line limits)
- **write** - Write to files (creates directories)
- **edit** - Replace text in files (with validation)
- **ls** - List directory contents (with hidden file support)

### Loop Strategies

The agent uses pluggable execution strategies (AgentLoop delegates to these):

- **SimpleLoopStrategy** - Basic prompt → response loop
- **ReActLoopStrategy** - Reasoning + Acting (default)
- **PlanSolveLoopStrategy** - Plan then solve
- **ReflectionLoopStrategy** - Self-reflection after each turn
- **SelfRefineLoopStrategy** - Continuous refinement

Configure via `AgentConfig`:

```typescript
const agent = new Agent({
  strategy: new ReActLoopStrategy(),
  maxRounds: 10,
});
```

## Utilities

### Bash Execution

Low-level shell execution with streaming:

```typescript
import { executeBash, executeBashLocal } from '@picro/agent';

const result = await executeBash('ls -la', {
  cwd: '/path/to/dir',
  timeout: 5000,
  onChunk: (chunk) => console.log(chunk),
  stripAnsi: true,
  truncateOutput: { maxBytes: 1024 * 1024 },
});

console.log(result.output);
console.log(result.exitCode);
console.log(result.truncated); // true if output was truncated
```

### Config Resolution

Resolve configuration from environment variables, shell commands, or literals:

```typescript
import { resolveConfigValue, resolveConfigValueUncached } from '@picro/agent';

// From environment variable (cached)
const apiKey = resolveConfigValue('ANTHROPIC_API_KEY'); // 'sk-...' or throw

// From shell command (cached, prefixed with '!')
const token = resolveConfigValue('!gcloud auth print-access-token');

// From literal (direct value)
const model = resolveConfigValue('claude-3.5-sonnet'); // 'claude-3.5-sonnet'

// Fallback with default
const temp = resolveConfigValue('TEMPERATURE', { default: 0.7 }); // 0.7

// Uncache (no memoization)
const fresh = resolveConfigValueUncached('MY_VAR');

// To list (comma-separated)
const tools = resolveConfigValueToList('PI_TOOLS'); // ['bash', 'read']
```

### Diagnostics

Collect system, memory, and performance metrics:

```typescript
import { collectDiagnostics, generateDiagnosticReport, formatFileSize } from '@picro/agent';

// Structured diagnostics
const diag = collectDiagnostics();
console.log(diag.system);     // { platform, arch, nodeVersion, cpus[] }
console.log(diag.memory);     // { rss, heapUsed, heapTotal, external }
console.log(diag.performance); // { uptime, cpuTime, loadAvg[] }

// Formatted report
const report = generateDiagnosticReport();
console.log(report);

// Format bytes nicely
console.log(formatFileSize(1024 * 1024)); // "1.0 MB"
```

### Output Sanitization

Validate and clean tool output:

```typescript
import { validateOutput, sanitizeOutput, safeReadFile } from '@picro/agent';

const validation = validateOutput(toolOutput, {
  maxBytes: 1024 * 1024,    // 1MB limit
  maxLines: 50000,
  stripAnsi: true,
  detectBinary: true,
});

console.log(validation.valid);      // false if binary or exceeds limits
console.log(validation.sanitized);  // Cleaned output
console.log(validation.warnings);   // ['Output exceeds max size']
console.log(validation.truncated);  // true if truncation occurred
console.log(validation.binary);     // true if binary detected

// Automatic truncation
const cleaned = sanitizeOutput(hugeOutput, { maxBytes: 100000 });

// Safe file read with limits
const content = await safeReadFile('/path/to/file', {
  maxBytes: 1024 * 1024,
  encoding: 'utf-8',
});
```

### Telemetry

Opt-in usage tracking:

```typescript
import { getTelemetry, setTelemetry, track } from '@picro/agent';

// Create telemetry instance
const telemetry = getTelemetry({ enabled: true });

// Enable/disable
setTelemetry({ enabled: true, sampleRate: 0.1 }); // 10% sampling

// Track custom events
track('session.created', {
  sessionId: 'abc123',
  model: 'claude-3.5-sonnet',
});

track('tool.executed', {
  toolName: 'bash',
  duration: 1234,
  success: true,
});

// Listen to all events
telemetry.on((payload) => {
  console.log('Telemetry:', payload.event, payload.properties);
});

// Disable
setTelemetry({ enabled: false });
```

### Event System

The agent emits structured events throughout execution:

```typescript
import { EventEmitter } from '@picro/agent';

// Subscribe to session events
const unsubscribe = session.onEvent('agent:turn:end', (event) => {
  console.log('Turn ended:', event.turnIndex);
});

// Event types
const events = [
  'agent:start', 'agent:end',
  'turn:start', 'turn:end',
  'message:start', 'message:update', 'message:end',
  'tool_call:start', 'tool_call:end',
  'tool:progress',
  'llm:request', 'llm:response',
  'memory:retrieval',
  'error',
];

// Priority-based event emitter
import { PrioritizedEventEmitter } from '@picro/agent';
const emitter = new PrioritizedEventEmitter({
  priorities: { 'agent:start': 100, 'error': 200 },
});
```

### Model Registry

Discover and manage available LLM models:

```typescript
import { DefaultModelRegistry, getModels, getProviders } from '@picro/agent';

const registry = new DefaultModelRegistry();

// List all models
const models = getModels();
console.log(models); // [{ provider: 'anthropic', model: 'claude-3.5-sonnet' }, ...]

// List all providers
const providers = getProviders(); // ['anthropic', 'openai', 'google']

// Get model by name
const model = getModel('anthropic/claude-3.5-sonnet');
```

### Settings Manager

Manage configuration across sessions:

```typescript
import { SettingsManager } from '@picro/agent';

const settings = SettingsManager.create(process.cwd(), './.pi/agent');

// Get settings
const compaction = settings.getCompactionConfig();
const terminal = settings.getTerminalConfig();
const model = settings.getDefaultModel();

// Update settings
settings.setDefaultModel('claude-3.5-sonnet');
settings.setCompactionEnabled(true);
settings.save();
```

### Resource Loader

Load project context files (README, package.json, etc.):

```typescript
import { DefaultResourceLoader, loadProjectContextFiles } from '@picro/agent';

const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: './.pi/agent',
  settingsManager,
});

// Load context files
const context = await loader.loadContextFiles([
  'README.md',
  'package.json',
  'tsconfig.json',
]);

// Or use helper
const files = await loadProjectContextFiles(process.cwd());
```

### Package Manager

Install and manage extension packages:

```typescript
import { DefaultPackageManager } from '@picro/agent';

const pkgManager = new DefaultPackageManager({
  packagesDir: './.pi/packages',
  registryUrl: 'https://registry.npmjs.org',
});

await pkgManager.installPackage({
  name: '@myorg/my-extension',
  version: '1.0.0',
});

const installed = pkgManager.listInstalled();
console.log(installed); // [{ name, version, path }, ...]
```

### Truncation Utilities

Utilities for truncating large outputs:

```typescript
import { truncateBytes, truncateLines, truncateMiddle, truncatePreserveEnds } from '@picro/agent';

// Truncate by byte size
const result = truncateBytes(longString, 1024); // max 1KB

// Truncate by line count
const lines = truncateLines(longString, 100); // max 100 lines

// Truncate middle (preserve head and tail)
const middle = truncateMiddle(longString, 200, 50, 50);

// Preserve start and end of file
const code = truncatePreserveEnds(longString, 50, tailLines: 10);
```

### Shell Utilities

Cross-platform shell operations:

```typescript
import { getShellConfig, getShellEnv, killProcessTree } from '@picro/agent';

// Get shell configuration
const shell = getShellConfig(); // { shell: '/bin/bash', args: ['-l', '-i'] }

// Get shell environment
const env = getShellEnv(process.cwd());

// Kill process tree
killProcessTree(pid);
```

### Performance Tracking

Track operation timings:

```typescript
import { PerformanceTracker } from '@picro/agent';

const tracker = new PerformanceTracker({ autoStart: true });

// Track custom spans
const span = tracker.startSpan('my-operation');
// ... do work ...
span.end();

// Get performance data
const sample = tracker.sample();
console.log(sample.durations); // { 'my-operation': 123.45 }
```

## Advanced Usage

### Custom Settings Manager

```typescript
import { SettingsManager, FileSettingsStorage, InMemorySettingsStorage } from '@picro/agent';

// File-based settings (persisted)
const fileStorage = new FileSettingsStorage('./settings.json');
const settings = new SettingsManager(fileStorage);

// In-memory settings (ephemeral)
const memStorage = new InMemorySettingsStorage({
  compaction: { enabled: true, reserveTokens: 1500 },
  terminal: { showImages: true, imageWidthCells: 60 },
});
const tempSettings = new SettingsManager(memStorage);
```

### Custom Tool Executor

```typescript
import { ToolExecutor, ToolExecutionContext } from '@picro/agent';

class MyToolExecutor extends ToolExecutor {
  async executeToolCall(toolCall: ToolCallData, context: ToolExecutionContext): Promise<ToolResult> {
    // Custom execution logic
    return { success: true, result: '...' };
  }
}

const executor = new MyToolExecutor(/* deps */);
```

### Custom Loop Strategy

```typescript
import { LoopStrategy, LoopStrategyFactory } from '@picro/agent';

class MyStrategy implements LoopStrategy {
  async transformPrompt(prompt: string, state: AgentRuntimeState): Promise<string> {
    // Modify prompt based on state
    return prompt;
  }

  shouldContinue(state: AgentRuntimeState, maxRounds: number): boolean {
    return state.round < maxRounds && !state.isCancelled;
  }
}

const strategyFactory = new LoopStrategyFactory();
strategyFactory.register('my-strategy', new MyStrategy());
```

### Custom Extension Runner

```typescript
import { ExtensionRunner, createExtensionRuntime } from '@picro/agent';

const runtime = createExtensionRuntime();
const runner = new ExtensionRunner(runtime);

// Load extensions manually
await runner.loadExtensions({
  extensions: [...],
  tools: [...],
  prompts: [...],
});
```

### Manual Session Branching

```typescript
import { SessionManager } from '@picro/agent';

// Create branch from specific point
const sessionManager = new SessionManager(cwd, sessionDir, persist);
sessionManager.branchWithSummary(
  'entry-123',
  'Alternative approach with TypeScript'
);

// Load branched session
const branched = SessionManager.open(branchedFile, sessionDir, cwd);
```

### Event Recording

Record all events for debugging:

```typescript
import { EventRecorder } from '@picro/agent';

const recorder = new EventRecorder({
  maxEvents: 10000,
  persist: true,
  filePath: './events.jsonl',
});

recorder.start();

// Later, replay events
const events = recorder.getEvents();
recorder.replay(events);
```

## Troubleshooting

### Model Not Found

Make sure the provider's API key is set in environment:

```bash
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
```

Check available models:

```typescript
import { getModels } from '@picro/agent';
console.log(getModels());
```

### Tool Output Truncated

Adjust limits in session configuration:

```typescript
session.configure({
  toolOutputMaxBytes: 5 * 1024 * 1024, // 5MB
  toolOutputMaxLines: 50000,
});
```

### Permission Denied on bash

Some commands require elevated privileges. Either:
- Use absolute paths
- Configure sudo in the command itself
- Adjust file permissions

### Session File Corruption

If session JSONL becomes corrupted, sessions can still often be recovered. Check diagnostics:

```typescript
import { generateDiagnosticReport } from '@picro/agent';
const report = generateDiagnosticReport();
console.log(report);
```

### High Memory Usage

Enable auto-compaction:

```typescript
session.allowAutoCompaction(true);
session.compactionThreshold = 0.8; // Compact at 80% context capacity
```

## API Reference

Detailed API documentation:
- [AgentSession](./docs/AgentSession.md)
- [AgentSessionRuntime](./docs/AgentSessionRuntime.md)
- [AgentLoop](./docs/AgentLoop.md)
- [SessionManager](./docs/SessionManager.md)
- [ToolExecutor](./docs/ToolExecutor.md)
- All types: [types.ts](./src/types.ts)

## Examples

See [examples/](./examples/) for working examples:

- `basic-session.ts` - Simple agent session with AgentSessionRuntime
- `custom-tools.ts` - Register custom tools
- `tool-executor.ts` - Executing tools manually
- `telemetry-demo.ts` - Telemetry setup
- `compaction.ts` - Manual and auto compaction
- `session-branching.ts` - Session persistence and branching
- `diagnostics.ts` - Collecting diagnostics

## License

Apache-2.0

---

<p align="center">Part of the <a href="https://github.com/your-org/picro">picro</a> ecosystem</p>
