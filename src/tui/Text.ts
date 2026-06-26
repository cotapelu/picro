// Text - Simple text rendering with styles
import { Component } from './Component';
import { colorize, reset } from './colors';

export interface TextProps {
  /**
   * Text content
   */
  text: string;
  /**
   * Text color (ANSI)
   */
  color?: string;
  /**
   * Background color (ANSI)
   */
  bgColor?: string;
  /**
   * Text style: 'bold', 'dim', 'italic', 'underline', 'blink', 'reverse'
   */
  style?: string | string[];
  /**
   * Max width (wrap text)
   */
  width?: number;
  /**
   * Alignment: 'left', 'center', 'right'
   */
  align?: 'left' | 'center' | 'right';
}

export class Text extends Component {
  private props: TextProps;

  constructor(props: TextProps) {
    super();
    this.props = props;
  }

  update(props: Partial<TextProps>): void {
    this.props = { ...this.props, ...props };
  }

  render(): string {
    let content = this.props.text;

    // Wrap if width specified
    if (this.props.width) {
      content = this.wrapText(content, this.props.width);
    }

    // Apply alignment
    if (this.props.align && this.props.width) {
      const lines = content.split('\n');
      content = lines.map(line => {
        const padding = this.props.width! - line.length;
        if (padding <= 0) return line;
        if (this.props.align === 'center') {
          const left = Math.floor(padding / 2);
          return ' '.repeat(left) + line + ' '.repeat(padding - left);
        } else if (this.props.align === 'right') {
          return ' '.repeat(padding) + line;
        }
        return line;
      }).join('\n');
    }

    // Apply styles
    const styled = this.applyStyles(content);

    return styled + reset();
  }

  private wrapText(text: string, width: number): string {
    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const para of paragraphs) {
      const words = para.split(/\s+/);
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length > width) {
          if (currentLine) {
            lines.push(currentLine.trim());
            currentLine = word;
          } else {
            lines.push(word);
          }
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
      }
      if (currentLine) {
        lines.push(currentLine.trim());
      }
    }

    return lines.join('\n');
  }

  private applyStyles(text: string): string {
    let styled = text;

    if (this.props.color) {
      styled = colorize(styled, this.props.color);
    }

    if (this.props.bgColor) {
      styled = this.applyBgColor(styled, this.props.bgColor);
    }

    if (this.props.style) {
      const styles = Array.isArray(this.props.style) ? this.props.style : [this.props.style];
      for (const style of styles) {
        styled = this.applySingleStyle(styled, style);
      }
    }

    return styled;
  }

  private applySingleStyle(text: string, style: string): string {
    switch (style) {
      case 'bold': return `\x1b[1m${text}\x1b[22m`;
      case 'dim': return `\x1b[2m${text}\x1b[22m`;
      case 'italic': return `\x1b[3m${text}\x1b[23m`;
      case 'underline': return `\x1b[4m${text}\x1b[24m`;
      case 'blink': return `\x1b[5m${text}\x1b[25m`;
      case 'reverse': return `\x1b[7m${text}\x1b[27m`;
      default: return text;
    }
  }

  private applyBgColor(text: string, bgColor: string): string {
    const bgMap: Record<string, string> = {
      black: '40',
      red: '41',
      green: '42',
      yellow: '43',
      blue: '44',
      magenta: '45',
      cyan: '46',
      white: '47',
      brightBlack: '100',
      brightRed: '101',
      brightGreen: '102',
      brightYellow: '103',
      brightBlue: '104',
      brightMagenta: '105',
      brightCyan: '106',
      brightWhite: '107',
    };
    const code = bgMap[bgColor];
    if (code) {
      return `\x1b[${code}m${text}\x1b[49m`;
    }
    return text;
  }
}

/**
 * Create a simple text component
 */
export function createText(text: string, props?: Partial<TextProps>): Text {
  return new Text({ text, ...props });
}
