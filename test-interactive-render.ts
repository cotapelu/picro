import { TerminalUI } from "./dist/tui/tui.js";
import { ProcessTerminal } from "./dist/tui/atoms/terminal.js";
import { Text } from "./dist/tui/atoms/index.js";
import { Editor } from "./dist/tui/organisms/editor.js";

// Mock terminal that writes to buffer
class MockTerminal {
  private output = "";
  start(onInput, onResize) {}
  stop() {}
  write(data) { this.output += data; }
  get columns() { return 80; }
  get rows() { return 24; }
  hideCursor() {}
  showCursor() {}
  clearLine() {}
  clearFromCursor() {}
  clearScreen() {}
  setTitle(title) {}
  moveBy(lines) {}
  moveTo(row, col) {}
  queryCellSize() { return Promise.resolve({width:9,height:18}); }
}

const mockTerm = new MockTerminal();
const tui = new TerminalUI(mockTerm);
const editor = new Editor({ paddingX: 1, paddingY: 0 });
tui.append(editor as any);

// Set size manually for test
(mockTerm as any).columns = 80;
(mockTerm as any).rows = 24;

// Simulate focus
tui.setFocus(editor as any);
tui.requestRender();
// Need to set previous dimensions to -1 to force full render
(tui as any).previousWidth = -1;
(tui as any).previousHeight = -1;
tui.renderInternal(); // force render

console.log("=== Rendered output (escape sequences stripped) ===");
console.log(mockTerm.output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, ' | '));
console.log("=== End output ===");

// Check that cursor marker appears
const hasCursor = mockTerm.output.includes('\x1b_pi:c\x07');
console.log("Has cursor marker:", hasCursor);
