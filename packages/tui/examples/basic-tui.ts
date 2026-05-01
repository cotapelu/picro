// Basic TUI Example
//
// Demonstrates creating a simple TerminalUI with a custom component.

import { TerminalUI, ProcessTerminal, Text, ElementContainer } from '@picro/tui';

class HelloWorld extends ElementContainer {
  draw(context) {
    const w = context.width;
    const line1 = 'Hello, TUI!'.padStart(Math.floor(w/2));
    const line2 = `Width: ${w}`.padStart(Math.floor(w/2));
    return [line1, line2];
  }
}

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);

tui.append(new HelloWorld());
tui.start();
