# @picro/tui

A modern, performant terminal UI library for Node.js, extracted and rewritten from pi-tui-legacy.

## Features

- **Rich Components**: 50+ components including Input, SelectList, Editor, Markdown, Messages, Dialogs, Selectors.
- **Themeable**: Full theme support with dark/light/high-contrast presets and easy customization.
- **Mouse & Keyboard**: Full keyboard navigation and mouse support with customizable keybindings.
- **Extensible**: Extension system via `ExtensionUIContext` for custom UI integration.
- **Tested**: Comprehensive test suite with Vitest.
- **Zero Runtime Dependencies** (except `highlight.js` for Markdown).

## Installation

```bash
npm install @picro/tui
```

## Quick Start

```typescript
import { TerminalUI, ProcessTerminal, Text } from '@picro/tui';

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);

tui.append(new Text('Hello, world!'));
terminal.start(tui.handleInput.bind(tui), tui.handleResize.bind(tui));
```

## Core Concepts

### UIElement and RenderContext

All visual components implement the `UIElement` interface:

```typescript
interface UIElement {
  draw(context: RenderContext): string[];
  clearCache?(): void;
}

interface RenderContext {
  width: number;
  height: number;
  theme?: UITheme;
}
```

Components are pure functions that render to an array of strings given a width and height.

### TerminalUI

`TerminalUI` is the main container that manages:
- Layout and rendering
- Focus management
- Input handling (keyboard and mouse)
- Panel stack for modal dialogs

You typically create one `TerminalUI` per application, attach your root component via `append`, and start the event loop with `terminal.start(...)`.

### Handling Input

Interactive components implement `InteractiveElement` (which has `isFocused` property) and optionally `handleKey(key: KeyEvent)`.

Set focus with `tui.setFocus(element)`.

### Panels

Use `tui.showPanel(component, options)` to display modal dialogs. Panels are stacked and can be positioned via `anchor` ('center', 'top-right', etc.) and sized with `width`/`height`.

## Component Reference

### Layout & Containers

- **ElementContainer** – Holds child UIElement; use `append(child)` to add.
- **Spacer** – Renders empty lines (`new Spacer({ lines: 2 })`).
- **Divider** – Horizontal separator line.
- **Box** – Container with border and optional background.

### Text & Display

- **Text** – Simple text with styling (color, bold, underline, wrap, truncate).
- **Markdown** – Renders Markdown with syntax highlighting.
- **Breadcrumbs** – Navigation breadcrumb trail.

### Input & Editing

- **Input** – Single-line text input with history, placeholder, and callbacks.
- **Editor** – Multi-line editor with undo/redo, kill-ring, and syntax highlighting (optional).

### Selection

- **SelectList** – Scrollable, filterable list with single or multi-select.
- **SettingsList** – List of settings with toggles and callbacks.

### Progress & Indicators

- **ProgressBar** – Visual progress indicator.
- **Rating** – Star rating control.
- **Stepper** – Step indicator (e.g., 1/5).
- **Badge** / **BadgeGroup** – Small status badges.
- **Loader** / **CancellableLoader** – Spinner with optional abort.

### Messages (Chat UI)

- **UserMessage** – Right-aligned bubble for user input.
- **AssistantMessage** – Left-aligned Markdown message.
- **ToolMessage** – Displays tool execution info (header, output, duration).
- **ToolExecution** – Composite for tool call and result.
- **BashExecutionMessage** – Bash command output with error handling.
- **CustomMessage** – Ad-hoc message with custom render function.
- **UserMessageSelector** – Shows user messages as selectable items.

### Dialogs

- **Modal** – Generic modal dialog with overlay.
- **Toast** – Auto-dismissing notification.
- **LoginDialog** – Login prompt with provider selection.
- **ConfirmDialog** – Yes/No confirmation.

### Selectors (Specific UI)

- **SessionSelector** – Choose from saved sessions.
- **ModelSelector** – Pick an LLM model.
- **SettingsSelector** – Adjust application settings.
- **ThemeSelector** – Choose visual theme.
- **OAuthSelector** – OAuth provider selection.
- **ExtensionSelector** – Extensions picker.
- **TreeSelector** – Hierarchical selection (files, etc.).
- **ThinkingSelector** – Select reasoning depth.
- **ConfigSelector** – Configuration editor (YAML/JSON).
- **FileBrowser** – Browse filesystem.
- **CommandPalette** – Command palette (Cmd/Ctrl+Shift+P style).
- **ContextMenu** – Right-click context menu.

### Utilities

- **CountdownTimer** – Fires callbacks on each second and expiration.
- **KeybindingHints** – Displays key hints.
- **fuzzyMatch**, **fuzzyFilter**, **fuzzyHighlight** – Fuzzy search utilities.
- **KillRing** / **UndoStack** – Text editing utilities.
- **renderDiff** – Render unified diffs.
- **truncateToVisualLines** – Smart truncation respecting ANSI and width.
- **visibleWidth**, **wrapText**, `truncateText`, `expandTabs` – Low-level text helpers.

## Themes

The library ships with three built-in themes:

```typescript
import { darkTheme, lightTheme, highContrastTheme, setTheme } from '@picro/tui';
setTheme(darkTheme); // or lightTheme, highContrastTheme
```

You can also create custom themes by implementing the `Theme` interface:

```typescript
import { Theme } from '@picro/tui';

const myTheme: Theme = {
  primary: '\x1b[38;5;220m',    // Yellow
  secondary: '\x1b[38;5;250m',  // Light gray
  accent: '\x1b[38;5;196m',     // Red
  background: '\x1b[48;5;0m',   // Black bg
  foreground: '\x1b[38;5;15m',  // White fg
  border: '\x1b[38;5;240m',     // Dim border
  selected: '\x1b[48;5;24m',    // Selection bg
  highlighted: '\x1b[48;5;237m',
  success: '\x1b[38;5;84m',
  warning: '\x1b[38;5;214m',
  error: '\x1b[38;5;203m',
  dim: '\x1b[38;5;8m',
};
setTheme(myTheme);
```

## Extensions

Extensions can obtain an `ExtensionUIContext` from `InteractiveMode` to present UI:

```typescript
// Inside an extension's execute function
export async function askQuestion(context: ExtensionUIContext): Promise<void> {
  const answer = await context.input('Your name', 'John Doe');
  context.notify(`Hello, ${answer}!`, 'success');
}
```

The context provides methods:
- `select(title, options)` – show a selector list
- `confirm(title, message)` – show a modal confirmation
- `input(title, placeholder)` – prompt for text
- `notify(message, type)` – show a toast
- `setStatus(key, text)` – set footer status
- `setEditorText`, `getEditorText`, `pasteToEditor` – editor manipulation
- `setTheme`, `getAllThemes` – theme management
- `custom(factory)` – show a custom panel
- …and more.

## Integration with Coding Agent

The `@picro/coding-agent` package uses `@picro/tui` for its CLI interface. Here's a simplified integration pattern:

```typescript
import { TerminalUI, ProcessTerminal, Input, Text, UserMessage, AssistantMessage, ToolMessage, ElementContainer } from '@picro/tui';
import { Agent } from '@picro/agent';

class MyApp {
  private tui: TerminalUI;
  private chat = new ElementContainer();
  private input!: Input;

  constructor() {
    const terminal = new ProcessTerminal();
    this.tui = new TerminalUI(terminal);
    this.setupUI();
  }

  private setupUI(): void {
    this.tui.append(new Text('My AI Assistant'));
    this.tui.append(this.chat);
    this.input = new Input({
      placeholder: 'Ask...',
      onSubmit: (q) => this.handleQuestion(q),
    });
    this.tui.append(this.input);
    this.tui.setFocus(this.input);
  }

  private async handleQuestion(prompt: string): Promise<void> {
    this.chat.append(new UserMessage({ text: prompt }));
    const agent = new Agent(/* ... */);
    const result = await agent.run(prompt);
    this.chat.append(new AssistantMessage({ content: result.finalAnswer }));
    this.tui.requestRender();
  }

  public async start(): Promise<void> {
    this.tui.start();
  }
}
```

## Building Custom UIs

You can compose arbitrary layouts using `ElementContainer`:

```typescript
class MyLayout implements UIElement {
  private header = new Text('Header', { bold: true });
  private content = new Text('Content goes here');
  private footer = new Text('Footer');

  draw(context: RenderContext): string[] {
    const width = context.width;
    const lines: string[] = [];

    // Header on first line
    lines.push(...this.header.draw({ width, height: 1 }));

    // Content fills middle
    const middleHeight = context.height - 2;
    lines.push(...this.content.draw({ width, height: middleHeight }));

    // Footer on last line
    lines.push(...this.footer.draw({ width, height: 1 }));

    return lines;
  }

  clearCache(): void {
    this.header.clearCache?.();
    this.content.clearCache?.();
    this.footer.clearCache?.();
  }
}
```

## Tooling

### Keybindings

Key handling uses `parseKey` and `getKeybindings`. You can customize keybindings by modifying the configuration (see `keybindings.ts`). The default bindings are:

- `tui.select.confirm` – Enter / Ctrl+M / Ctrl+J
- `tui.select.cancel` – Escape / Ctrl+G
- `tui.select.up` – Up / Ctrl+P / K
- `tui.select.down` – Down / Ctrl+N / J
- `tui.select.pageup` – PageUp / Alt+Up
- `tui.select.pagedown` – PageDown / Alt+Down

### Terminal Capabilities

The library detects terminal capabilities (Kitty protocol, iTerm2 images, etc.) automatically. Use `terminal.setCellDimensions` for precise image rendering on non-standard cell sizes.

### Debugging

Enable debug logging by setting environment variable `PI_DEBUG=1`. You can also attach a `onDebug` callback to `TerminalUI`.

## API Reference

For complete API details, see the TypeScript definitions in `dist/src/index.d.ts`.

## License

Apache-2.0
