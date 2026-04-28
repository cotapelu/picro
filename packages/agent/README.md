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

```typescript
import { AgentSession } from '@picro/agent';

const session = new AgentSession({
  cwd: process.cwd(),
  model: 'claude-3.5-sonnet',
  thinkingLevel: 'medium',
});

// Send a prompt
const result = await session.prompt('Help me refactor this code');
console.log(result.content);
```

## Core Concepts

### AgentSession

The main class for agent interaction:

```typescript
interface AgentSessionConfig {
  cwd: string;
  model?: string;
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}

class AgentSession {
  // Send a prompt and get response
  prompt(message: string): Promise<AgentResponse> {}

  // Execute a tool manually
  executeTool(name: string, input: any): Promise<ToolResult> {}

  // Subscribe to events
  onEvent(event: AgentEvent, handler: (e: any) => void): () => void {}

  // Model management
  setModel(model: string): Promise<void> {}
  cycleModel(): void {}

  // Thinking level
  setThinkingLevel(level: ThinkingLevel): void {}

  // Compaction
  compact(): Promise<CompactionResult> {}
  getContextTokens(): number {}

  // Session persistence
  saveSession(label?: string): void {}
  getSessions(): SessionInfo[] {}
  loadSession(id: string): void {}
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

- **bash** - Execute shell commands
- **read** - Read file contents (with size limits)
- **write** - Write to files (creates directories)
- **edit** - Replace text in files
- **ls** - List directory contents

Use the factory functions:

```typescript
import { createBashToolDefinition, createReadToolDefinition } from '@picro/agent';

const bashTool = createBashToolDefinition();
session.registerTool(bashTool);
```

## Utilities

### Bash Execution

```typescript
import { executeBash } from '@picro/agent';

const result = await executeBash('ls -la', {
  cwd: '/path/to/dir',
  timeout: 5000,
  onChunk: (chunk) => console.log(chunk),
});

console.log(result.output);
console.log(result.exitCode);
console.log(result.truncated); // If output was truncated
```

### Config Resolution

```typescript
import { resolveConfigValue, resolveConfigValueToList } from '@picro/agent';

// Env var or literal
const apiKey = resolveConfigValue('ANTHROPIC_API_KEY'); // 'sk-...'

// Shell command (cached)
const token = resolveConfigValue('!gcloud auth print-access-token');
```

### Diagnostics

```typescript
import { collectDiagnostics, generateDiagnosticReport } from '@picro/agent';

const diag = collectDiagnostics();
console.log(diag.system); // OS, Node version, CPU, memory
console.log(diag.memory); // RSS, heap usage
console.log(diag.performance); // uptime, CPU time

// Or get formatted report
const report = generateDiagnosticReport();
console.log(report);
```

### Output Sanitization

```typescript
import { validateOutput, sanitizeOutput } from '@picro/agent';

const validation = validateOutput(toolOutput, {
  maxSize: 1024 * 1024, // 1MB
  maxLineLength: 10000,
  stripAnsi: true,
});

console.log(validation.valid);      // false if binary
console.log(validation.sanitized);  // Cleaned output
console.log(validation.warnings);   // ['Output exceeds max size']
console.log(validation.truncated);  // true if truncated
```

### Telemetry

```typescript
import { getTelemetry, track } from '@picro/agent';

const telemetry = getTelemetry({ enabled: true });
telemetry.setEnabled(true);

// Track custom events
track('tool.executed', {
  toolName: 'bash',
  duration: 1234,
  success: true,
});

// Listen to events
telemetry.on((payload) => {
  console.log('Telemetry:', payload.event, payload.properties);
});
```

### System Prompt

```typescript
import { buildSystemPrompt } from '@picro/agent';

const prompt = buildSystemPrompt({
  cwd: process.cwd(),
  selectedTools: ['bash', 'read', 'write'],
  toolSnippets: {
    bash: 'Execute a shell command',
    read: 'Read a file',
    write: 'Write to a file',
  },
  promptGuidelines: ['Always verify file paths', 'Be concise'],
  contextFiles: [
    { path: 'README.md', content: '# Project\n...' },
  ],
});
```

## Advanced Usage

### Custom Settings Manager

```typescript
import { SettingsManager } from '@picro/agent';

const settings = new SettingsManager({
  compaction: { enabled: true, reserveTokens: 1500 },
  terminal: { showImages: true, imageWidthCells: 60 },
});

session.settingsManager = settings;
```

### Package Manager

```typescript
import { DefaultPackageManager } from '@picro/agent';

const pkgManager = new DefaultPackageManager({
  packagesDir: './.pi/packages',
});

await pkgManager.installPackage({
  name: '@myorg/my-extension',
  version: '1.0.0',
});

const installed = pkgManager.listInstalled();
```

### Footer Data Provider

```typescript
import { DefaultFooterDataProvider, getGitInfo } from '@picro/agent';

const footerProvider = new DefaultFooterDataProvider();

// Update git info periodically
setInterval(async () => {
  const gitInfo = await getGitInfo(process.cwd());
  if (gitInfo) {
    footerProvider.setGitInfo(gitInfo);
    footerProvider.setCustom('branch', gitInfo.branch);
  }
}, 10000);
```

## API Reference

See [API.md](./docs/API.md) for complete API documentation.

## Examples

See [examples/](./examples/) for working examples:

- `basic-agent.ts` - Simple agent session
- `tools-demo.ts` - Using built-in tools
- `custom-tool.ts` - Register custom tools
- `telemetry-demo.ts` - Telemetry setup

## Troubleshooting

### Model Not Found

Make sure the provider's API key is set in environment:

```bash
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
```

### Tool Output Truncated

Adjust limits:

```typescript
session.configure({
  maxOutputSize: 5 * 1024 * 1024, // 5MB
  maxOutputLines: 50000,
});
```

### Permission Denied on bash

Some commands require elevated privileges. Use absolute paths or configure sudo in the command itself.

## License

Apache-2.0

---

<p align="center">Part of the <a href="https://github.com/your-org/picro">picro</a> ecosystem</p>
