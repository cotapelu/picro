# Agent + TUI Integration Examples

This directory contains minimal examples showing how to combine `@picro/agent` and `@picro/tui`.

## Example

### `main.ts` (InteractiveMode)

The main example using `InteractiveMode` - the highest-level TUI API:

```bash
npm run build:example
npm run start:example
```

Features:
- Chat UI with user/assistant/tool messages
- Real-time status updates
- Event-driven integration
- Auto-scrolling
- Keyboard shortcuts (Ctrl+C to quit)

## Project Structure

```
src/
├── main.ts          # Single example file (InteractiveMode)
├── tsconfig.json    # TypeScript configuration
├── README.md        # This file
└── dist/            # Compiled output (gitignored)
```

## How It Works

1. **Create AgentSessionRuntime** - High-level agent API
2. **Create InteractiveMode** - High-level TUI API
3. **Connect via event subscription** - Agent events update UI
4. **User input** → `session.prompt()` → Agent events → UI updates

## Key API

### AgentSessionRuntime
- `createAgentSessionRuntime(options)` - Entry point
- `runtime.session` - The AgentSession
- `session.prompt(text)` - Send a message

### InteractiveMode
- `new InteractiveMode({ tui, inputPlaceholder, onUserInput })` - Constructor
- `interactive.addUserMessage(text)` - Add user bubble
- `interactive.addAssistantMessage(text)` - Add assistant bubble
- `interactive.addToolMessage(name, output)` - Add tool result
- `interactive.setStatus(text)` - Update footer
- `interactive.run()` - Start event loop (blocking)
- `interactive.stop()` - Exit

### Agent Events Used
- `message:end` (role: user/assistant) → add message bubbles
- `tool:call:start` → tool start indicator
- `tool:call:end` → tool result
- `agent:start/end` → status updates
- `error` → error display

## Building

```bash
# Build all packages first
npm run build

# Build the example
npm run build:example

# Run it
npm run start:example
```

## Customization

### Adjust Model/Thinking Level

Edit `main.ts`:
```typescript
const runtime = await createAgentSessionRuntime(
  // ...
  {
    model: 'claude-3.5-sonnet',  // or 'gemini-pro', 'gpt-4'
    thinkingLevel: 'high',       // 'low' | 'medium' | 'high'
    tools: ['bash', 'read', 'ls'],
  }
);
```

### Add Custom Tools

Register custom tools after runtime creation:
```typescript
runtime.session.registerTool({
  name: 'my-tool',
  description: 'Does something useful',
  schema: { type: 'object', properties: { arg: { type: 'string' } } },
  async execute(input) {
    return { success: true, result: `You passed: ${input.arg}` };
  },
});
```

### Change UI Layout

InteractiveMode uses built-in chat layout. For custom layouts, use `TerminalUI` directly with Box/Text/Input components.
