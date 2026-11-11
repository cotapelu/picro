// Footer component - input hints and shortcuts
import type { InteractiveState } from './types.js';

export interface FooterProps {
  /**
   * Show keyboard shortcuts help
   */
  showShortcuts?: boolean;
  /**
   * Custom shortcuts to display
   */
  shortcuts?: Array<{ key: string; description: string }>;
  /**
   * Terminal width
   */
  width?: number;
}

const DEFAULT_SHORTCUTS = [
  { key: 'Enter', description: 'Send' },
  { key: 'Ctrl+C', description: 'Quit' },
  { key: '↑/↓', description: 'History' },
  { key: 'Ctrl+R', description: 'Resume' },
  { key: 'Ctrl+N', description: 'New' },
  { key: '?', description: 'Help' },
];

export function renderFooter(
  state: InteractiveState,
  props: FooterProps = {}
): string {
  const width = props.width || 80;
  const shortcuts = props.shortcuts || DEFAULT_SHORTCUTS;

  const left = state.isProcessing ? '⏳ Processing...' : 'Ready';

  const right = shortcuts
    .map(s => `${s.key}:${s.description}`)
    .join(' | ');

  const separator = '─'.repeat(width);
  const content = left.padEnd(width - right.length) + right;

  return `\n└${content}┘`;
}

export function renderSimpleFooter(width = 80): string {
  const shortcuts = DEFAULT_SHORTCUTS.slice(0, 4);
  const right = shortcuts.map(s => `${s.key}:${s.description}`).join(' | ');
  const separator = '─'.repeat(width);
  return `\n└${'Ready'.padEnd(width - right.length)}${right}┘\n${separator}`;
}
