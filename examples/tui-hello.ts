/**
 * TUI Hello World
 *
 * Simple terminal UI example.
 */

import { TerminalUI, ProcessTerminal, Text } from '@picro/tui';

class HelloWorld extends ElementContainer {
  draw(context) {
    const lines: string[] = [];
    lines.push('╔═══════════════════════════════════╗');
    lines.push('║  🎉 Welcome to picro TUI! 🎉     ║');
    lines.push('║                                   ║');
    lines.push(`║  Terminal width: ${context.width.toString().padStart(3)} cols        ║`);
    lines.push(`║  Terminal height: ${context.height.toString().padStart(3)} rows       ║`);
    lines.push('║                                   ║');
    lines.push('║  Press Ctrl+C to exit             ║');
    lines.push('╚═══════════════════════════════════╝');
    return lines;
  }
}

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);

tui.append(new HelloWorld());
tui.start();
