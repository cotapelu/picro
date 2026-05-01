# @picro/tui

Terminal UI Library for building interactive terminal applications.

## Features

- ✅ **Differential Rendering** - Only updates changed lines for smooth animations
- ✅ **Overlay System** - Position modals and panels with flexible anchoring and z-index
- ✅ **Viewport Scrolling** - Large content handled with scroll APIs
- ✅ **Terminal Images** - Support for Kitty and iTerm2 image protocols
- ✅ **ANSI-aware** - Proper handling of wide characters and escape codes
- ✅ **Cursor IME** - Hardware cursor positioning for IME candidate windows
- ✅ **Component Library** - 75+ components (Input, Editor, SelectList, Markdown, Messages, etc.)
- ✅ **Key Repeat** - Configurable repeat delay/interval for held keys
- ✅ **Performance Metrics** - Dirty line count, render stats

## Installation

```bash
npm install @picro/tui
```

## Quick Start

```typescript
import { TerminalUI, ProcessTerminal } from '@picro/tui';
import { Text } from '@picro/tui';

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);

// Add a simple text component
class MyUI extends ElementContainer {
  draw(context) {
    return [`Hello, World! Width: ${context.width}`];
  }
}

tui.append(new MyUI());
tui.start();
```

## Core Concepts

### TerminalUI

The main class that manages the terminal screen and input handling.

```typescript
const tui = new TerminalUI(terminal);
tui.start(); // Begin listening to input and rendering
tui.stop();  // Clean up and restore terminal state
```

### Components

All components implement the `UIElement` interface:

```typescript
interface UIElement {
  draw(context: RenderContext): string[];
  handleKey?(key: KeyEvent): void;
  clearCache(): void;
}
```

### RenderContext

Provides dimensions for rendering:

```typescript
interface RenderContext {
  width: number;   // Available columns
  height: number;  // Available rows
  theme?: UITheme; // Optional theme
}
```

## Utility Functions

- `visibleWidth(str)` - Calculate display width (handles wide chars)
- `truncateToWidth(text, width)` - Truncate with ellipsis
- `wrapText(text, width)` - Simple word wrapping
- `wrapTextWithAnsi(text, width)` - ANSI-aware wrapping
- `fuzzyFilter(items, query, getter)` - Fuzzy search
- `getKeybindings()` - Access keybindings manager

## Examples

See [examples/](./examples/) for working demos:

- `basic-tui.ts` - Simple "Hello World"
- `input-form.ts` - Input with submit callback
- `select-list.ts` - Scrollable selection list
- `markdown.ts` - Markdown rendering
- `panel.ts` - Modal overlay demo
- `terminal-image.ts` - Image rendering

## API Reference

Full API documentation is available in [API.md](./API.md).

## Terminal Images

```typescript
import { renderImage, getImageDimensions, getCapabilities } from '@picro/tui';

const caps = getCapabilities();
if (caps.images) {
  const dims = getImageDimensions(base64Data, 'image/png');
  const result = renderImage(base64Data, dims, { maxWidthCells: 80 });
  if (result) {
    // result.sequence contains the escape codes to display the image
    terminal.write(result.sequence);
  }
}
```

## Overlays (Modals)

Panels can be displayed on top of base content with flexible positioning and z-index stacking:

```typescript
const handle = tui.showPanel(component, {
  anchor: 'center',
  width: 60,
  height: 20,
  zIndex: 10, // higher = on top
});

// Control the overlay
handle.focus();
handle.setHidden(true);
handle.close();

// Dynamic reordering
handle.bringToFront();
handle.sendToBack();
handle.setZIndex(5);
```

## Viewport Scrolling

For content larger than the terminal, use the scroll APIs:

```typescript
tui.scroll(5); // scroll down 5 lines
tui.scroll(-1); // scroll up 1 line
tui.scrollTo(100); // scroll to absolute line index
const metrics = tui.getScrollMetrics(); // { scrollTop, totalLines, viewportLines }
```

## Key Repeat

Configure auto-repeat when keys are held down:

```typescript
tui.setKeyRepeatConfig(500, 50); // delay 500ms, interval 50ms
tui.setKeyRepeatEnabled(true);
```

## Keybindings

```typescript
import { getKeybindings } from '@picro/tui';

const kb = getKeybindings();
kb.setBinding('my-action', ['ctrl+x', 'escape']);
kb.pushContext('select-list'); // Set current context
```

## Theming

Components can use themes for colors:

```typescript
interface UITheme {
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  accentColor?: string;
}
```

## Built-in Components

- **Input** - Single-line text input with history
- **Editor** - Multi-line editor with undo/redo, kill ring
- **SelectList** - Scrollable selection list
- **SettingsList** - Toggle settings list
- **Text** - Plain text display
- **Markdown** - Markdown rendering
- **UserMessage / AssistantMessage / ToolMessage** - Chat bubbles
- **Footer** - Status bar with left/right items
- **Modal** - Modal overlay
- **Toast** - Temporary notifications
- **Loader** - Spinner/progress indicators

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - Kiến trúc và phân tầng
- [Components](./docs/COMPONENTS.md) - Danh mục components theo lớp
- [API Reference](./docs/API.md) - API đầy đủ (to be generated)


## Examples

See [examples/](./examples/) for complete working examples.

## License

Apache-2.0

---

<p align="center">Built with ❤️ for the pi ecosystem</p>
