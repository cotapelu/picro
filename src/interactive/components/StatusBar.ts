// StatusBar component - renders bottom status line
import type { StatusBarState } from './types.js';

export function renderStatusBar(state: StatusBarState, width = 80): string {
  const leftWidth = state.left.length;
  const rightWidth = state.right.length;
  const middleWidth = width - leftWidth - rightWidth - 2; // for spaces

  const left = state.left.padEnd(leftWidth);
  const right = state.right.padStart(rightWidth);
  const middle = middleWidth > 0 ? ' '.repeat(middleWidth) : '';

  const line = left + middle + right;
  return '┌' + line.padEnd(width) + '┐';
}

export function createDefaultStatusBar(): StatusBarState {
  return {
    left: 'Ready',
    right: 'picro',
  };
}

export function createProcessingStatusBar(model?: string): StatusBarState {
  return {
    left: 'Processing...',
    right: model ? `[${model}]` : '[Agent]',
  };
}

export function updateStatusLeft(state: StatusBarState, text: string): StatusBarState {
  return { ...state, left: text };
}

export function updateStatusRight(state: StatusBarState, text: string): StatusBarState {
  return { ...state, right: text };
}
