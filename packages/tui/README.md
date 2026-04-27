# @picro/tui

A modern, performant terminal UI library for Node.js, extracted and rewritten from pi-tui-legacy.

## Features

- **Rich Components**: Input, SelectList, Editor, Markdown, Messages, Dialogs, Selectors, and more.
- **Themeable**: Full theme support with dark/light/high-contrast presets.
- **Mouse & Keyboard**: Full keyboard navigation and mouse support.
- **Extensible**: Extension system with UIContext for custom UI.
- **Tested**: Comprehensive test suite with Vitest.

## Installation

```bash
npm install @picro/tui
```

## Quick Start

```typescript
import { TerminalUI } from '@picro/tui';
import { ProcessTerminal } from '@picro/tui';

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);

tui.append(new Text('Hello, world!', 1, 1));
terminal.start(tui.handleInput.bind(tui), tui.handleResize.bind(tui));
```

## Components

### Core

- `TerminalUI`: Main UI container
- `ElementContainer`: Base class for composite components
- `UIElement`, `InteractiveElement`: Interfaces

### Input

- `Input`: Single-line text input
- `Editor`: Multi-line editor with undo/redo, kill-ring

### Selection

- `SelectList`: Scrollable list with filtering
- `SettingsList`: List of settings with toggles

### Display

- `Text`, `Markdown`, `Spacer`, `Divider`, `Box`

### Messages

- `UserMessage`, `AssistantMessage`, `ToolMessage`
- `ToolExecution`, `BashExecutionMessage`, `CustomMessage`

### Dialogs

- `Modal`, `Toast`, `LoginDialog`, `ConfirmDialog`

### Selectors

- `SessionSelector`, `ModelSelector`, `SettingsSelector`
- `ThemeSelector`, `ExtensionSelector`, `TreeSelector`, etc.

### Utilities

- `CountdownTimer`: Reusable countdown
- `ThinkingSelector`: Choose reasoning level
- `expandTabs`, `visibleWidth`, `truncateText`, etc.

## Themes

```typescript
import { setTheme, darkTheme } from '@picro/tui';
setTheme(darkTheme);
```

## Extensions

Extensions can interact with the UI via `ExtensionUIContext`:

```typescript
import type { ExtensionUIContext } from '@picro/tui';

export function myExtension(context: ExtensionUIContext) {
  context.notify('Hello from extension!', 'info');
}
```

## TypeScript Support

Fully typed with comprehensive TypeScript definitions.

## License

Apache-2.0
