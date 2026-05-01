// Markdown Rendering Example
//
// Renders a simple markdown document.

import { TerminalUI, ProcessTerminal, Markdown } from '@picro/tui';

const markdown = `
# Welcome to TUI

This is a **bold** text and this is *italic*.

- Item 1
- Item 2
- Item 3

[Link to GitHub](https://github.com)
`;

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);
tui.append(new Markdown(markdown.trim()));
tui.start();
