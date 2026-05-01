// Terminal Image Example
//
// Renders an image if terminal supports it.

import { TerminalUI, ProcessTerminal, Text, renderImage, getCapabilities, getImageDimensions } from '@picro/tui';
import { readFileSync } from 'fs';

// Try to read a local image file, or use a placeholder.
// Ensure the file exists or adjust path.
const IMAGE_PATH = './example.png';

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);

class ImageViewer extends ElementContainer {
  private imageSeq?: string;

  constructor() {
    super();
    try {
      const data = readFileSync(IMAGE_PATH);
      const dims = getImageDimensions(data, 'image/png');
      const result = renderImage(data, dims, { maxWidthCells: 40 });
      if (result) {
        this.imageSeq = result.sequence;
      }
    } catch (e) {
      this.imageSeq = undefined;
    }
  }

  draw(context) {
    const lines: string[] = [];
    if (this.imageSeq) {
      lines.push(this.imageSeq);
    } else {
      lines.push('Image not available (missing file or unsupported terminal).');
    }
    lines.push('');
    lines.push('Example: TUI with terminal image support.');
    return lines;
  }
}

tui.append(new ImageViewer());
tui.start();
