// Header component - top status bar
import type { InteractiveState } from './types';

export interface HeaderProps {
  /**
   * Current mode/context
   */
  mode?: string;
  /**
   * Current working directory
   */
  cwd?: string;
  /**
   * Model in use
   */
  model?: string;
  /**
   * Session ID
   */
  sessionId?: string;
  /**
   * Custom title
   */
  title?: string;
  /**
   * Terminal width (auto-detect if 0)
   */
  width?: number;
}

export function renderHeader(
  state: InteractiveState,
  props: HeaderProps = {}
): string {
  const width = props.width || 80;
  const { cwd, model, mode } = state;

  // Build left side: mode + cwd
  const modeStr = mode || 'INTERACTIVE';
  const cwdStr = cwd ? `📁 ${cwd.split('/').pop() || cwd}` : '';
  const left = `${modeStr}${cwdStr ? ' | ' + cwdStr : ''}`;

  // Build right side: model + session
  const modelStr = model ? `[${model.split('/').pop()}]` : '';
  const sessionShort = state.messages.length > 0 ? `📝 ${state.messages.length}` : '';
  const right = `${modelStr}${sessionShort ? (modelStr ? ' | ' : '') + sessionShort : ''}`;

  // Construct header line
  const separator = '─'.repeat(width);
  const content = left.padEnd(width - right.length) + right;

  return `┌${content}┐\n${separator}`;
}

export function createDefaultHeaderProps(): HeaderProps {
  return {
    mode: 'INTERACTIVE',
    width: 80,
  };
}
