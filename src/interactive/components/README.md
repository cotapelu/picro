# Interactive Components Library

Pure TypeScript components for building interactive TUI applications.

## Components

### Toast
- `createToast(message, type, duration)` - Create toast notification
- `renderToast(toast, index, maxWidth)` - Render toast to string
- `filterActiveToasts(toasts, now)` - Filter expired toasts
- `isToastExpired(toast, now)` - Check if toast expired

Types: `Toast`, `ToastType` ('info' | 'success' | 'error' | 'warning')

### Modal
- `renderModal(modalState)` - Render modal to string
- `getModalRenderer(type)` - Get renderer for modal type

Built-in modal types:
- `help` - Help modal with command list
- `thinking` - Thinking level selector
- `confirmation` - Yes/No confirmation
- `login` - Login prompt
- `session-selector` - Session list
- `model-selector` - Model list

### Input
- `createInputState(initialValue, options)` - Create input state
- `updateInputValue(state, value)` - Update value
- `moveInputHistoryUp(state)` - Navigate history up
- `moveInputHistoryDown(state)` - Navigate history down
- `addToHistory(state, value, maxEntries)` - Add entry to history
- `renderInput(state, prompt, width)` - Render input line
- `isInputEmpty(state)` - Check if empty

### MessageList
- `renderMessage(message, width, showTimestamp)` - Render single message
- `renderMessageList(messages, options)` - Render all messages
- `getLastAssistantMessage(messages)` - Get last assistant msg
- `getLastUserMessage(messages)` - Get last user msg

### StatusBar
- `renderStatusBar(state, width)` - Render status bar
- `createDefaultStatusBar()` - Default ready state
- `createProcessingStatusBar(model?)` - Processing state
- `updateStatusLeft(state, text)` - Update left text
- `updateStatusRight(state, text)` - Update right text

## Usage Example

```typescript
import {
  createToast, renderToast,
  renderModal,
  createInputState, renderInput,
  renderMessageList,
  createDefaultStatusBar, renderStatusBar,
  ToastType
} from './components';

// State
const state = {
  toasts: [createToast('Hello', 'success')],
  modal: { type: 'none' },
  input: createInputState(),
  messages: [],
  statusBar: createDefaultStatusBar(),
};

// Render
const toastsOutput = state.toasts.map((t, i) => renderToast(t, i)).join('\n');
const modalOutput = renderModal(state.modal);
const inputOutput = renderInput(state.input);
const messagesOutput = renderMessageList(state.messages);
const statusBarOutput = renderStatusBar(state.statusBar);
```
