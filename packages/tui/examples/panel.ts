// Panel Overlay Example
//
// Shows how to create a modal panel overlay.

import { TerminalUI, ProcessTerminal, Text, Box, Button } from '@picro/tui';

// Note: Button component not available in current set; use Text as placeholder.
// This example demonstrates showPanel API.

class MainScreen extends ElementContainer {
  draw(context) {
    return ['Press Enter to open modal'];
  }
}

class ModalContent extends ElementContainer {
  draw(context) {
    const lines: string[] = [];
    lines.push('┌──────────────────────────────┐');
    lines.push('│      Modal Dialog             │');
    lines.push('│                              │');
    lines.push('│  Hello! This is a modal.      │');
    lines.push('│  Press Enter to close.        │');
    lines.push('└──────────────────────────────┘');
    return lines;
  }
}

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);

const main = new MainScreen();
tui.append(main);

tui.start();

// After a short delay, show the panel
setTimeout(() => {
  const modal = new ModalContent();
  const handle = tui.showPanel(modal, {
    anchor: 'center',
    width: 36,
    height: 7,
  });
  // Press Enter to close
  tui.addKeyHandler((key) => {
    if (key.name === 'Enter') {
      handle.close();
    }
  });
}, 1000);
