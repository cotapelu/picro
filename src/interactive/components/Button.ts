// Button component - for modals and menus
import type { BoxProps } from '../tui/Box'; // We'll use our Box or create simple text

export interface ButtonProps {
  /**
   * Button label
   */
  label: string;
  /**
   * Button style: 'primary', 'secondary', 'danger', 'neutral'
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral';
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Width (auto if undefined)
   */
  width?: number;
  /**
   * Padding
   */
  padding?: { top: number; right: number; bottom: number; left: number };
}

const VARIANT_STYLES: Record<string, { bg: string; fg: string; border: string }> = {
  primary: { bg: 'bgBlue', fg: 'white', border: 'blue' },
  secondary: { bg: 'bgBrightBlack', fg: 'white', border: 'brightBlack' },
  danger: { bg: 'bgRed', fg: 'white', border: 'red' },
  neutral: { bg: 'bgBlack', fg: 'white', border: 'brightBlack' },
};

export function renderButton(props: ButtonProps, selected = false): string {
  const style = VARIANT_STYLES[props.variant || 'neutral'];
  const padding = props.padding || { top: 0, right: 2, bottom: 0, left: 2 };

  const label = props.disabled ? ` ${props.label} ` : ` ${props.label} `;
  const width = props.width || label.length;

  // Build box around label
  const border = 'rounded';
  const paddedLabel = ' '.repeat(padding.left) + label + ' '.repeat(padding.right);

  // Build lines
  const lines: string[] = [];

  // Top border
  const topBorder = props.disabled ? '┌' + '─'.repeat(width - 2) + '┐'
    : selected ? `\x1b[7m┌${'─'.repeat(width - 2)}┐\x1b[0m`
    : `┌${'─'.repeat(width - 2)}┐`;
  lines.push(topBorder);

  // Content line
  let contentLine = '│' + paddedLabel.padEnd(width - 2) + '│';
  if (props.disabled) {
    contentLine = contentLine; // dim style
  } else if (selected) {
    contentLine = `\x1b[7m${contentLine}\x1b[0m`;
  }
  lines.push(contentLine);

  // Bottom border
  const bottomBorder = props.disabled ? '└' + '─'.repeat(width - 2) + '┘'
    : selected ? `\x1b[7m└${'─'.repeat(width - 2)}┘\x1b[0m`
    : `└${'─'.repeat(width - 2)}┘`;
  lines.push(bottomBorder);

  return lines.join('\n');
}

export function createButton(
  label: string,
  variant: ButtonProps['variant'] = 'neutral',
  onPress?: () => void
): ButtonProps {
  return {
    label,
    variant,
    disabled: false,
    padding: { top: 0, right: 2, bottom: 0, left: 2 },
    width: undefined,
    ...(onPress && { onClick: onPress }),
  };
}
