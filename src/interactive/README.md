# Interactive Library

High-level UI components built on top of the TUI core library for building interactive terminal applications.

## Architecture

```
src/tui/                    # TUI Core Library
  ├── Screen.ts            # Terminal management, render loop
  ├── Component.ts         # Base component classes
  ├── Box.ts               # Layout container
  ├── Text.ts              # Text rendering with styles
  └── colors.ts            # ANSI color utilities

src/interactive/components/  # Interactive Components
  ├── types.ts             # Common type definitions
  ├── StateManager.ts      # Reactive state container
  ├── Toast.ts             # Toast notifications
  ├── Modal.ts             # Modal renderers
  ├── Header.ts            # Top status bar
  ├── Footer.ts            # Bottom input hints
  ├── Input.ts             # Input state management
  ├── MessageList.ts       # Chat message rendering
  ├── Button.ts            # Button component
  ├── ProgressBar.ts       # Progress indicators
  ├── StatusBar.ts         # Status bar component
  └── SelectionList.ts     # List selection with scrolling

src/interactive/           # Interactive Mode Logic
  ├── actions.ts          # Action creators (toast, modal, etc.)
  ├── app-events.ts       # Event subscription
  ├── command-handlers.ts # Slash command handlers
  └── signal-handlers.ts  # Signal handling
```

## Usage

### Basic Example

```typescript
import { Screen } from '../tui/Screen';
import {
  StateManager,
  createInitialState,
  renderHeader,
  renderFooter,
  renderMessageList,
  renderInput,
  renderToast,
  renderModal,
} from '../interactive/components';

// Create state
const stateManager = new StateManager(createInitialState());

// Create screen
const screen = new Screen({ title: 'picro' });

// Add render loop
screen.onResize(() => screen.render());
screen.onInput(async (key) => {
  // Handle input
  if (key === '\r') { // Enter
    const input = stateManager.getProperty('input');
    if (input.value.trim()) {
      // Send message...
    }
  }
});

// Render function
function render() {
  const state = stateManager.get();
  const width = screen.getSize().width;

  const header = renderHeader(state, { width });
  const messages = renderMessageList(state.messages, { width, maxMessages: 20 });
  const footer = renderFooter(state, { width });

  screen.clear();
  screen.stdout.write(header + '\n\n');
  screen.stdout.write(messages + '\n\n');
  screen.stdout.write(renderInput(state.input, '> ', width) + '\n');
  screen.stdout.write(footer);
}

// Subscribe to state changes
stateManager.subscribe('toasts', () => screen.render());
stateManager.subscribe('messages', () => screen.render());
stateManager.subscribe('modal', () => screen.render());
stateManager.subscribe('input', () => screen.render());

screen.start();
```

### State Management

The `StateManager` provides reactive state:

```typescript
// Subscribe to specific property
const unsub = stateManager.subscribe('toasts', (change) => {
  console.log('Toasts changed:', change.previous, '->', change.current);
});

// Update
stateManager.update('toasts', (prev) => [...prev, createToast('Hello', 'success')]);

// Unsubscribe
unsub();
```

### Components

All components are pure functions that render to strings:

```typescript
// Toast
const toast = createToast('Operation complete', 'success');
const rendered = renderToast(toast, 0);

// Modal
const modal = { type: 'confirmation', props: { title: 'Delete?', message: 'Are you sure?' } };
const rendered = renderModal(modal);

// Header
const header = renderHeader(state, { width: 80 });

// Progress bar
const progress = renderProgressBar({ value: 0.75, width: 30 });
```

## Integrating with Runtime

The `StateManager` connects UI to the `AgentSessionRuntime` via action creators in `src/interactive/actions.ts`:

```typescript
import { subscribeToRuntimeEvents } from '../interactive/app-events';
import { StateManager } from '../interactive/components';

const runtime = ...; // AgentSessionRuntime

// Subscribe runtime events to state
subscribeToRuntimeEvents(runtime, {
  onMessageStart: (event) => {
    stateManager.update('isProcessing', true);
  },
  onMessageEnd: (event) => {
    stateManager.update('isProcessing', false);
    stateManager.update('messages', (prev) => [...prev, {
      id: event.messageId,
      role: 'assistant',
      content: event.content,
      timestamp: Date.now(),
    }]);
  },
  // ... other handlers
});
```

## Building Interactive Mode

The interactive mode entry point should:

1. Create `StateManager` with initial state
2. Create `Screen` from TUI core
3. Subscribe runtime events to state updates
4. Setup input handlers that call command handlers and update state
5. Subscribe state changes to trigger `screen.render()`
6. Call `screen.start()`

See `src/modes/tui-mode.ts` for the current (Ink-based) implementation pattern.
