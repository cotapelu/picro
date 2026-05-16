import { TerminalUI } from "./dist/tui/tui.js";
import { ProcessTerminal } from "./dist/tui/atoms/terminal.js";
import { Text } from "./dist/tui/atoms/index.js";

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);

// Append a simple text component
const text = new Text("Hello from Picro TUI! Press Ctrl+C to exit.");
tui.append(text);

tui.start();

// Auto-stop after 10 seconds for test
setTimeout(() => tui.stop(), 10000);
