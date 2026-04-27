# @picro/agent

Core agent logic for tool-based AI agents.

## Features

- **Agent Loop**: Loop-strategy pattern with tool execution
- **Session Management**: Create, resume, fork, and manage sessions
- **Context Management**: Build and manage conversation context
- **Tools**: Execute and manage AI tools (read, bash, edit, write, grep, find, ls)
- **Extensions**: Load and run extensions for custom functionality
- **Prompt Templates**: Load from markdown files with argument substitution
- **System Prompt Builder**: Build system prompts with tools, guidelines, and context
- **Model Resolver**: Resolve model patterns to actual models
- **Compaction**: Session context compaction with token estimation
- **Telemetry**: Optional usage telemetry

## Installation

```bash
npm install @picro/agent
```

## Usage

```typescript
import { createAgent } from "@picro/agent";

const agent = createAgent({
  cwd: process.cwd(),
  agentDir: "~/.pi/agent",
});

await agent.start();
```

## API

### Core

- `createAgent()` - Create a new agent instance
- `runAgent()` - Run agent with options
- `AgentRunner` - Main agent runner class

### Session

- `SessionManager` - Manage sessions
- `createSession()` - Create new session
- `getSession()` - Get session by ID

### Tools

- `ToolExecutor` - Execute tools
- `registerTool()` - Register custom tool

### Extensions

- `loadExtensions()` - Load extensions
- `ExtensionRunner` - Run extensions

### Context

- `ContextBuilder` - Build conversation context
- `Compactor` - Compact session context

## License

Apache-2.0