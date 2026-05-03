import type { UIElement, RenderContext } from '../atoms/base.js';
import { Markdown } from '../molecules/markdown.js';
import { Text } from '../molecules/text.js';
import { wrapText, visibleWidth } from '../atoms/internal-utils.js';

export interface CustomMessageOptions {
  customType: string;
  content: string | Array<{ type: string; text: string }>;
  label?: string;
  color?: string; // ANSI color name
  bgColor?: string;
  padding?: number;
  expanded?: boolean;
}

/**
 * CustomMessage - displays custom message entries from extensions
 * Uses distinct styling to differentiate from user/assistant messages
 */
export class CustomMessage implements UIElement {
  constructor(private opts: CustomMessageOptions) {}

  setContent(content: string | Array<{ type: string; text: string }>): void {
    this.opts = { ...this.opts, content };
  }

  setExpanded(expanded: boolean): void {
    this.opts = { ...this.opts, expanded: expanded };
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const padding = this.opts.padding ?? 1;
    const innerWidth = Math.max(1, width - padding * 2);
    const lines: string[] = [];

    // Extract text content
    let textContent: string;
    if (typeof this.opts.content === 'string') {
      textContent = this.opts.content;
    } else {
      textContent = this.opts.content
        .filter((c): c is { type: string; text: string } => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
    }

    // Label/header with custom type
    const label = this.opts.label || `[${this.opts.customType}]`;
    const labelColor = this.opts.color ? this.getColorAnsi(this.opts.color) : '\x1b[35m'; // purple default
    const bgColor = this.opts.bgColor ? this.getBgColorAnsi(this.opts.bgColor) : '';

    // Header line with background
    let headerLine = ' '.repeat(padding);
    if (bgColor) {
      headerLine += bgColor + labelColor + '\x1b[1m' + label + '\x1b[0m';
    } else {
      headerLine += labelColor + '\x1b[1m' + label + '\x1b[0m';
    }
    lines.push(this.padToWidth(headerLine, width));

    // Divider
    const divider = '─'.repeat(innerWidth);
    lines.push(' '.repeat(padding) + '\x1b[90m' + divider + '\x1b[0m');

    // Content using Markdown
    if (textContent.trim()) {
      const markdown = new Markdown(textContent);
      const rawLines = markdown.draw({ ...context, width: innerWidth });

      // Apply padding and optional color
      const pad = ' '.repeat(padding);
      const contentColor = this.opts.color ? this.getColorAnsi(this.opts.color) : '';

      for (const line of rawLines) {
        let rendered = pad + line;
        if (contentColor) {
          rendered = pad + contentColor + line + '\x1b[0m';
        }
        lines.push(this.padToWidth(rendered, width));
      }
    } else {
      lines.push(' '.repeat(padding) + '\x1b[90m(empty)\x1b[0m');
    }

    return lines;
  }

  private padToWidth(line: string, width: number): string {
    const visible = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    if (visible < width) {
      return line + ' '.repeat(width - visible);
    }
    return line;
  }

  private getColorAnsi(colorName: string): string {
    const fgMap: Record<string, string> = {
      black: '30', red: '31', green: '32', yellow: '33',
      blue: '34', magenta: '35', cyan: '36', white: '37',
      default: '39',
    };
    return `\x1b[${fgMap[colorName] || fgMap.default}m`;
  }

  private getBgColorAnsi(colorName: string): string {
    const bgMap: Record<string, string> = {
      black: '40', red: '41', green: '42', yellow: '43',
      blue: '44', magenta: '45', cyan: '46', white: '47',
      default: '49',
    };
    return `\x1b[${bgMap[colorName] || bgMap.default}m`;
  }

  clearCache(): void {}
}
