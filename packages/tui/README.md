# @picro/tui

Terminal User Interface library for Coding Agent - Built from scratch with a component-based architecture.

## Features

- 🎨 **Component-Based Architecture** - Modular, reusable UI components
- ⚡ **Differential Rendering** - Only update changed lines for better performance
- 🎯 **Focus Management** - Built-in focus handling for interactive components
- 📦 **Overlay System** - Support for modals, dialogs, and floating panels
- 🌈 **ANSI Color Support** - Full color and styling support
- 📏 **Responsive Layout** - Components adapt to terminal size
- 🔤 **Wide Character Support** - Proper handling of CJK characters and emojis

## Installation

```bash
npm install @picro/tui
```

## Quick Start

```typescript
import { TUI, Text, Box } from '@picro/tui';

// Create TUI instance
const tui = new TUI();

// Create components
const title = new Text({
  content: 'Hello, World!',
  color: 'green',
  bold: true,
  align: 'center',
});

const box = new Box({
  title: 'My Box',
  borderColor: 'blue',
  padding: 1,
  children: [title],
});

// Set root component and start
tui.setRoot(box);
tui.start();
```

## Components

### Text

Simple text display with styling options:

```typescript
const text = new Text({
  content: 'Styled text',
  color: 'red',
  bgColor: 'black',
  bold: true,
  underline: true,
  align: 'center',
  wrap: true,
});
```

### Box

Container with border and padding:

```typescript
const box = new Box({
  title: 'Container',
  border: true,
  borderColor: 'blue',
  padding: 2,
  children: [text],
});
```

### Input

Interactive text input field:

```typescript
const input = new Input({
  placeholder: 'Enter text...',
  onSubmit: (value) => {
    console.log('Submitted:', value);
  },
});
```

### Button

Clickable button component:

```typescript
const button = new Button({
  label: 'Click Me',
  onClick: () => {
    console.log('Button clicked!');
  },
});
```

### List

Scrollable list component:

```typescript
const list = new List({
  items: ['Item 1', 'Item 2', 'Item 3'],
  onSelect: (item) => {
    console.log('Selected:', item);
  },
});
```

### Markdown

Markdown renderer with syntax highlighting:

```typescript
const markdown = new Markdown({
  content: '# Heading\n\nSome **bold** text.',
});
```

## Architecture

### Component Interface

All components must implement the `Component` interface:

```typescript
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}
```

### Focusable Components

Components that can receive focus must implement the `Focusable` interface:

```typescript
interface Focusable {
  focused: boolean;
}
```

### TUI Class

Main TUI class that manages rendering and input:

```typescript
const tui = new TUI({
  terminal: customTerminal,
  enableAltScreen: true,
});

tui.setRoot(rootComponent);
tui.start();
```

## Utilities

### visibleWidth

Calculate visible width accounting for ANSI codes and wide characters:

```typescript
import { visibleWidth } from '@picro/tui';

const width = visibleWidth('Hello 世界'); // Returns 11
```

### wrapText

Wrap text to fit within a given width:

```typescript
import { wrapText } from '@picro/tui';

const lines = wrapText('Long text here', 20);
```

### truncateText

Truncate text with ellipsis:

```typescript
import { truncateText } from '@picro/tui';

const truncated = truncateText('Very long text', 10);
```

## Overlay System

Add floating panels and modals:

```typescript
const modal = new Box({
  title: 'Modal',
  children: [content],
});

tui.addOverlay(modal, {
  anchor: 'center',
  width: '50%',
  height: '30%',
});

// Later remove it
tui.removeOverlay(modal);
```

## Focus Management

Set focus to interactive components:

```typescript
tui.setFocus(inputComponent);

// Get focused component
const focused = tui.getFocusedComponent();
```

## Styling

### Colors

Available colors:
- `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`
- `brightBlack`, `brightRed`, `brightGreen`, `brightYellow`, `brightBlue`, `brightMagenta`, `brightCyan`, `brightWhite`

### Text Styles

- `bold` - Bold text
- `dim` - Dimmed text
- `underline` - Underlined text

## Examples

See the `examples/` directory for more examples:

- Basic usage
- Form with multiple inputs
- Scrollable lists
- Modal dialogs
- Custom components

## License

MIT
