# Agent + TUI Integration Examples

This directory contains examples showing how to combine `@picro/agent` and `@picro/tui` to build terminal-based AI agent interfaces.

## Examples

### 1. Basic Integration (`main.ts`)

Full-featured agent TUI with:
- Message display (user, assistant, tool outputs)
- Input field with submit button
- Real-time status updates
- Toast notifications
- Keyboard shortcuts (Ctrl+C to quit)
- Auto-scrolling message history

**Run:**
```bash
npm run build
npm start
```

### 2. Minimal Example (`minimal.ts`)

Simplest possible integration - just a prompt loop:

```typescript
import { createAgentSessionRuntime } from '@picro/agent';
import { TerminalUI, Text, Input } from '@picro/tui';

// ... minimal implementation
```

## Project Structure

```
src/
├── package.json          # Dependencies on @picro/agent and @picro/tui
├── tsconfig.json          # TypeScript config with path mappings
├── main.ts               # Full-featured example (see above)
├── minimal.ts            # Simple prompt loop
├── AgentTUI.ts           # Glue class connecting agent + TUI
└── README.md             # This file
```

## Architecture

```
┌────────────────────────────────────────────────┐
│              AgentSessionRuntime                │
│  (from @picro/agent - manages agent lifecycle) │
└─────────────────┬──────────────────────────────┘
                  │ owns
                  ▼
        ┌─────────────────┐
        │   AgentSession  │
        │ (orchestrator)  │
        └────────┬────────┘
                 │ emits events
                 ▼
        ┌─────────────────┐
        │    AgentTUI     │ ◄── Glue class
        │ (event handler) │
        └────────┬────────┘
                 │ updates
                 ▼
        ┌─────────────────┐
        │   TerminalUI    │
        │  (from @picro/  │
        │      tui)       │
        └─────────────────┘
```

## Key Integration Points

1. **AgentTUI** subscribes to agent events:
   ```typescript
   session.onEvent('message:end', (event) => {
     // Update TUI with assistant message
     this.addMessage(`Assistant: ${content}`, 'white');
   });
   ```

2. **User input** sends prompts to agent:
   ```typescript
   this.inputField.onSubmit = async () => {
     await this.session.prompt(this.inputField.value);
   };
   ```

3. **Tool execution** displays real-time updates:
   ```typescript
   session.onEvent('tool_call:start', (event) => {
     this.addMessage(`🔧 ${event.toolName}`, 'yellow');
   });
   ```

## Customization

### Custom UI Components

TUI provides atoms, molecules, organisms, and interactive components:

```typescript
import { Box, Text, Button, Input, Scrollable } from '@picro/tui';

// Build custom layout
const layout = new Box({
  direction: 'vertical',
  children: [
    new Text('Custom Header', { bold: true }),
    new Scrollable({ /* ... */ }),
  ],
});
```

### Custom Agent Configuration

```typescript
const runtime = await createAgentSessionRuntime({
  cwd: process.cwd(),
  model: 'claude-3.5-sonnet',
  thinkingLevel: 'high',
  tools: ['bash', 'read', 'write', 'edit', 'ls', 'my-custom-tool'],
});
```

### Event Handling

Subscribe to any agent event:

```typescript
const events = [
  'agent:start', 'agent:end',
  'turn:start', 'turn:end',
  'message:start', 'message:end',
  'tool_call:start', 'tool_call:end',
  'tool:progress',
  'llm:request', 'llm:response',
  'memory:retrieval',
  'error',
];
```

## Building

From the monorepo root:

```bash
# Build all packages
npm run build

# Build only agent and tui
npm run build:agent && npm run build:tui

# Build and run example
cd src
npm install
npm run build
npm start
```

## Next Steps

- Add file browser panel (from TUI atoms/molecules)
- Implement session switching UI
- Add model selector dropdown
- Show tool results in syntax-highlighted panels
- Add streaming response display
- Integrate memory panel from TUI
