import type { UIElement, RenderContext } from '../base.js';
import { Markdown } from '../markdown.js';

export interface AssistantMessageOptions {
  content?: string; // markdown string
  isLoading?: boolean;
  color?: string; // optional text color (ANSI name)
  padding?: number;
}

/**
 * AssistantMessage - left-aligned message with Markdown rendering
 */
export class AssistantMessage implements UIElement {
  constructor(private opts: AssistantMessageOptions = {}) {}

  setContent(content: string): void {
    this.opts = { ...this.opts, content };
  }

  setLoading(isLoading: boolean): void {
    this.opts = { ...this.opts, isLoading };
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const padding = this.opts.padding ?? 0;
    const innerWidth = Math.max(1, width - padding * 2);

    if (this.opts.isLoading) {
      // Simple loading indicator
      const line = '⏳ Thinking...';
      const pad = ' '.repeat(padding);
      return [pad + line];
    }

    const content = this.opts.content ?? '';
    if (!content.trim()) {
      return [];
    }

    // Use Markdown component with inner width
    const markdown = new Markdown(content);
    const rawLines = markdown.draw({ ...context, width: innerWidth });

    // Apply padding left and optional color
    const pad = ' '.repeat(padding);
    const applyColor = this.opts.color ? this.colorAnsi(this.opts.color) : '';

    return rawLines.map(line => {
      let rendered = pad + line;
      if (applyColor) {
        // Apply color to full line
        rendered = applyColor + line + '\x1b[0m';
        // prepend padding after color
        rendered = pad + rendered;
      }
      // Ensure full width
      const visibleLen = line.replace(/\x1b\[[0-9;]*m/g, '').length + padding;
      if (visibleLen < width) {
        rendered += ' '.repeat(width - visibleLen);
      }
      return rendered;
    });
  }

  private colorAnsi(colorName: string): string {
    const fgMap: Record<string, string> = {
      black: '30', red: '31', green: '32', yellow: '33',
      blue: '34', magenta: '35', cyan: '36', white: '37',
      default: '39',
    };
    return `\x1b[${fgMap[colorName] || fgMap.default}m`;
  }

  clearCache(): void {}
}
