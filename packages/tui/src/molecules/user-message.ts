import type { UIElement, RenderContext } from '../atoms/base.js';
import { wrapText, visibleWidth } from '../atoms/internal-utils.js';

export interface UserMessageOptions {
  text: string;
  color?: string; // foreground (simple 8-color name)
  bgColor?: string;
  padding?: number;
}

/**
 * UserMessage - right-aligned bubble for user messages
 */
export class UserMessage implements UIElement {
  constructor(private opts: UserMessageOptions = { text: '' }) {}

  setText(text: string): void {
    this.opts = { ...this.opts, text };
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const padding = this.opts.padding ?? 2;
    const innerWidth = Math.max(1, width - padding * 2);

    // Wrap text to inner width
    const rawLines = wrapText(this.opts.text, innerWidth);

    // Build styled lines, right-aligned to full width
    return rawLines.map(line => {
      const textLen = visibleWidth(line);
      const leftSpaces = Math.max(0, width - textLen);
      const padded = ' '.repeat(leftSpaces) + line;
      // Apply colors for the text part only; spaces remain default
      const colored = this.applyColors(padded, line);
      // Ensure full width (colored may have ANSI codes that don't count)
      const finalWidth = visibleWidth(colored);
      if (finalWidth < width) {
        return colored + ' '.repeat(width - finalWidth);
      }
      return colored;
    });
  }

  private applyColors(fullLine: string, textPart: string): string {
    const { color, bgColor } = this.opts;
    if (!color && !bgColor) return fullLine;

    const codes: string[] = [];
    if (color) {
      const fgMap: Record<string, string> = {
        black: '30', red: '31', green: '32', yellow: '33',
        blue: '34', magenta: '35', cyan: '36', white: '37',
        default: '39',
      };
      codes.push(`\x1b[${fgMap[color] || fgMap.default}m`);
    }
    if (bgColor) {
      const bgMap: Record<string, string> = {
        black: '40', red: '41', green: '42', yellow: '43',
        blue: '44', magenta: '45', cyan: '46', white: '47',
        default: '49',
      };
      codes.push(`\x1b[${bgMap[bgColor] || bgMap.default}m`);
    }
    const ansi = codes.join('');
    // Insert ANSI before textPart, reset after textPart (preserving spaces outside)
    const before = fullLine.slice(0, fullLine.indexOf(textPart));
    const after = fullLine.slice(fullLine.indexOf(textPart) + textPart.length);
    return before + ansi + textPart + '\x1b[0m' + after;
  }

  clearCache(): void {}
}
