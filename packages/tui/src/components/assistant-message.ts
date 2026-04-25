/**
 * AssistantMessage Component
 * Renders an assistant/AI message with themed styling
 */
import type { UIElement, RenderContext } from '../tui.js';
import { Markdown } from './markdown.js';
import { Box } from './box.js';

// OSC 133 shell integration markers
const OSC133_ZONE_START = '\x1b]133;A\x07';
const OSC133_ZONE_END = '\x1b]133;B\x07';
const OSC133_ZONE_FINAL = '\x1b]133;C\x07';

export interface AssistantMessageTheme {
  /** Background color */
  bgColor?: (str: string) => string;
  /** Text color */
  textColor: (str: string) => string;
  /** Accent color for thinking/borders */
  accentColor?: (str: string) => string;
  /** Dim color for metadata */
  dimColor?: (str: string) => string;
}

export interface AssistantMessageOptions {
  /** Message content (markdown) */
  text: string;
  /** Theme styling */
  theme?: AssistantMessageTheme;
  /** Model/provider name */
  modelName?: string;
  /** Whether message is still streaming/generating */
  streaming?: boolean;
  /** Horizontal padding */
  paddingX?: number;
  /** Vertical padding */
  paddingY?: number;
  /** Show model info header */
  showHeader?: boolean;
}

/**
 * AssistantMessage component for chat interface
 * 
 * Renders AI/assistant responses with streaming indicator
 * and model information.
 * 
 * @example
 * const message = new AssistantMessage({
 *   text: responseText,
 *   modelName: 'Claude 3.5 Sonnet',
 *   streaming: true,
 *   theme: {
 *     textColor: (s) => `\x1b[37m${s}\x1b[0m`,
 *     accentColor: (s) => `\x1b[36m${s}\x1b[0m`,
 *   }
 * });
 */
export class AssistantMessage implements UIElement {
  private content!: string;
  private markdown!: Markdown;
  private options!: Omit<AssistantMessageOptions, 'text' | 'theme'> & { text: string; theme: AssistantMessageTheme };

  constructor(options: AssistantMessageOptions) {
    this.content = options.text;
    this.options = {
      text: options.text,
      modelName: options.modelName ?? 'Assistant',
      streaming: options.streaming ?? false,
      paddingX: options.paddingX ?? 1,
      paddingY: options.paddingY ?? 1,
      showHeader: options.showHeader ?? true,
      theme: options.theme ?? {
        textColor: (s) => s,
      },
    };
    this.markdown = new Markdown(this.content, this.options.paddingX, this.options.paddingY);
  }

  /**
   * Update message content (for streaming)
   */
  setText(text: string): void {
    this.content = text;
    this.markdown.setContent(text);
  }

  /**
   * Append text (for streaming updates)
   */
  appendText(text: string): void {
    this.content += text;
    this.markdown.setContent(this.content);
  }

  /**
   * Get current text
   */
  getText(): string {
    return this.content;
  }

  /**
   * Set streaming state
   */
  setStreaming(streaming: boolean): void {
    this.options.streaming = streaming;
  }

  draw(context: RenderContext): string[] {
    const lines: string[] = [];
    const width = context.width;
    const dimColor = this.options.theme.dimColor ?? ((s: string) => `\x1b[90m${s}\x1b[0m`);
    const accentColor = this.options.theme.accentColor ?? ((s: string) => `\x1b[36m${s}\x1b[0m`);

    // Header with model info
    if (this.options.showHeader) {
      const streamingIndicator = this.options.streaming ? ' ○' : '';
      const header = `┤ ${this.options.modelName}${streamingIndicator} ├`;
      const padLeft = Math.floor((width - header.length) / 2);
      const padRight = width - header.length - padLeft;
      lines.push(dimColor('─'.repeat(padLeft) + header + '─'.repeat(padRight)));
    }

    // Message content
    const md = this.markdown!;
    const contentLines = md.draw({
      width: width - (this as any).options.paddingX * 2,
      height: (context as any).height ?? 24,
    });

    // Apply styling
    for (const line of contentLines) {
      if (line.trim() === '') {
        lines.push(line);
      } else {
        const styled = this.options.theme.textColor(line);
        if (this.options.theme.bgColor) {
          lines.push(this.options.theme.bgColor(styled));
        } else {
          lines.push(styled);
        }
      }
    }

    // Footer spacer
    lines.push('');

    // Add OSC 133 markers
    if (lines.length > 0) {
      lines[0] = OSC133_ZONE_START + lines[0];
      lines[lines.length - 1] = lines[lines.length - 1] + OSC133_ZONE_END + OSC133_ZONE_FINAL;
    }

    return lines;
  }

  clearCache(): void {
    this.markdown.clearCache();
  }
}
