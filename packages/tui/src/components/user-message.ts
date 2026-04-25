/**
 * UserMessage Component
 * Renders a user message with themed background
 */
import type { UIElement, RenderContext } from '../tui.js';
import { Box } from './box.js';
import { Markdown } from './markdown.js';

// OSC 133 shell integration markers
const OSC133_ZONE_START = '\x1b]133;A\x07';
const OSC133_ZONE_END = '\x1b]133;B\x07';
const OSC133_ZONE_FINAL = '\x1b]133;C\x07';

export interface UserMessageTheme {
  /** Background color for message */
  bgColor: (str: string) => string;
  /** Text color */
  textColor: (str: string) => string;
  /** Border color */
  borderColor?: (str: string) => string;
}

export interface UserMessageOptions {
  /** Message content (markdown) */
  text: string;
  /** Theme styling */
  theme?: UserMessageTheme;
  /** Horizontal padding */
  paddingX?: number;
  /** Vertical padding */
  paddingY?: number;
  /** Show border */
  border?: boolean;
}

/**
 * UserMessage component for chat interface
 * 
 * Renders user messages with a distinctive background and
 * includes OSC 133 shell integration markers for terminal UI.
 * 
 * @example
 * const message = new UserMessage({
 *   text: 'Hello world',
 *   theme: {
 *     bgColor: (s) => `\x1b[48;5;234m${s}\x1b[0m`,
 *     textColor: (s) => `\x1b[37m${s}\x1b[0m`,
 *   }
 * });
 */
export class UserMessage implements UIElement {
  private content!: string;
  private markdown!: Markdown;
  private options: Omit<UserMessageOptions, 'text' | 'theme'> & { text: string; theme: UserMessageTheme };

  constructor(options: UserMessageOptions) {
    this.content = options.text;
    this.options = {
      text: options.text,
      paddingX: options.paddingX ?? 1,
      paddingY: options.paddingY ?? 1,
      border: options.border ?? false,
      theme: options.theme ?? {
        bgColor: (s) => s,
        textColor: (s) => s,
      },
    };
    this.markdown = new Markdown(this.content, this.options.paddingX, this.options.paddingY);
  }

  /**
   * Update message content
   */
  setText(text: string): void {
    this.content = text;
    this.markdown.setContent(text);
  }

  /**
   * Get current text
   */
  getText(): string {
    return this.content;
  }

  draw(context: RenderContext): string[] {
    const lines = this.markdown.draw(context);
    if (lines.length === 0) return lines;

    // Apply background to all lines
    const result = lines.map(line => {
      const styled = this.options.theme.textColor(line);
      return this.options.theme.bgColor(styled);
    });

    // Add OSC 133 markers
    result[0] = OSC133_ZONE_START + result[0];
    result[result.length - 1] = result[result.length - 1] + OSC133_ZONE_END + OSC133_ZONE_FINAL;

    return result;
  }

  clearCache(): void {
    this.markdown.clearCache();
  }
}
