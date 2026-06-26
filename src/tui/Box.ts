// Box - Layout container with border/padding
import { ContainerComponent } from './Component';

export interface BoxProps {
  /**
   * Box content (string or component)
   */
  content?: string | Component;
  /**
   * Border style: 'single', 'double', 'rounded', 'none'
   */
  border?: 'single' | 'double' | 'rounded' | 'none';
  /**
   * Padding: { top, right, bottom, left }
   */
  padding?: { top: number; right: number; bottom: number; left: number };
  /**
   * Margin: { top, right, bottom, left }
   */
  margin?: { top: number; right: number; bottom: number; left: number };
  /**
   * Width (fixed or dynamic)
   */
  width?: number;
  /**
   * Height (fixed or dynamic)
   */
  height?: number;
  /**
   * Alignment: 'left', 'center', 'right', 'top', 'bottom'
   */
  align?: 'left' | 'center' | 'right' | 'top' | 'bottom';
  /**
   * Background color
   */
  bgColor?: string;
  /**
   * Text color
   */
  color?: string;
}

const BORDER_CHARS = {
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  none: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
};

export class Box extends ContainerComponent {
  private props: Required<BoxProps>;

  constructor(props: BoxProps = {}) {
    super();
    this.props = {
      content: '',
      border: 'none',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      width: undefined as any,
      height: undefined as any,
      align: 'left',
      bgColor: '',
      color: '',
      ...props,
    };

    if (typeof props.content === 'string') {
      this.content = props.content;
    } else if (props.content) {
      this.add(props.content);
    }
  }

  set content(value: string | Component) {
    this.clear();
    if (typeof value === 'string') {
      const textComp = createTextComponent(value);
      this.add(textComp);
    } else if (value) {
      this.add(value);
    }
  }

  render(): string {
    const lines = this.buildLines();
    const marginTop = this.props.margin.top;
    const marginBottom = this.props.margin.bottom;
    const marginLeft = this.props.margin.left;
    const marginRight = this.props.margin.right;

    const marginTopLines = Array(marginTop).fill('');
    const marginBottomLines = Array(marginBottom).fill('');
    const marginLeftPad = ' '.repeat(marginLeft);
    const marginRightPad = ' '.repeat(marginRight);

    const renderedLines = lines.map(line => marginLeftPad + line + marginRightPad);

    return [
      ...marginTopLines,
      ...renderedLines,
      ...marginBottomLines,
    ].join('\n');
  }

  private buildLines(): string[] {
    const content = this.renderChildren();
    const contentLines = content.split('\n');
    const maxContentWidth = Math.max(...contentLines.map(l => l.length), 0);

    const pad = this.props.padding;
    const border = this.props.border;
    const chars = BORDER_CHARS[border];

    // Calculate total width
    const innerWidth = maxContentWidth + pad.left + pad.right;
    const totalWidth = (border !== 'none' ? 2 : 0) + innerWidth;

    // Apply fixed width if specified
    const finalWidth = this.props.width ?? totalWidth;

    // Build lines
    const lines: string[] = [];

    // Top margin padding
    for (let i = 0; i < pad.top; i++) {
      lines.push(this.padHorizontal(this.makeEmptyLine(finalWidth, border)));
    }

    // Content lines with vertical borders
    for (const contentLine of contentLines) {
      const paddedLine = contentLine.padEnd(maxContentWidth + pad.right);
      const line = chars.v + ' '.repeat(pad.left) + paddedLine + ' '.repeat(pad.right) + chars.v;
      lines.push(this.padHorizontal(line));
    }

    // Bottom margin padding
    for (let i = 0; i < pad.bottom; i++) {
      lines.push(this.padHorizontal(this.makeEmptyLine(finalWidth, border)));
    }

    // Add horizontal borders if border not none
    if (border !== 'none') {
      const horizontalLine = chars.tl + chars.h.repeat(finalWidth - 2) + chars.tr;
      lines.unshift(this.padHorizontal(horizontalLine));
      lines.push(this.padHorizontal(chars.bl + chars.h.repeat(finalWidth - 2) + chars.br));
    }

    return lines;
  }

  private makeEmptyLine(width: number, border: string): string {
    if (border === 'none') {
      return '';
    }
    return ' '.repeat(width);
  }

  private padHorizontal(line: string): string {
    if (this.props.width && line.length < this.props.width) {
      const padding = this.props.width - line.length;
      if (this.props.align === 'center') {
        const left = Math.floor(padding / 2);
        const right = padding - left;
        return ' '.repeat(left) + line + ' '.repeat(right);
      } else if (this.props.align === 'right') {
        return ' '.repeat(padding) + line;
      }
    }
    return line;
  }
}

function createTextComponent(text: string): Component {
  return {
    render: () => text,
  };
}
