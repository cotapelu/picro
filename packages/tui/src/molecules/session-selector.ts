/**
 * Session Selector Component
 * Interactive list for selecting sessions
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base.js';
import { visibleWidth, truncateText } from '../atoms/internal-utils.js';

export interface SessionInfo {
  id: string;
  name: string;
  cwd: string;
  updatedAt: Date;
}

export interface SessionSelectorOptions {
  sessions: SessionInfo[];
  onSelect?: (session: SessionInfo) => void;
  onCancel?: () => void;
}

export class SessionSelector implements UIElement, InteractiveElement {
  private sessions: SessionInfo[];
  private selectedIndex: number = 0;
  private onSelect?: (session: SessionInfo) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: SessionSelectorOptions) {
    this.sessions = options.sessions;
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Sessions ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.sessions.length && i < context.height - 6; i++) {
      const session = this.sessions[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const date = this.formatDate(session.updatedAt);
      const line = prefix + truncateText(session.name, 30) + ' ' + date;
      lines.push('│' + line + ' '.repeat(borderWidth - line.length) + '│');
    }

    while (lines.length < context.height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = '↑↓ navigate  Enter select  Esc cancel';
    lines.push('│ ' + help + ' '.repeat(borderWidth - help.length - 2) + '│');
    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    return lines;
  }

  private formatDate(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    return Math.floor(hours / 24) + 'd';
  }

  handleKey(key: KeyEvent): void {
    const data = key.raw;

    if (data === '\x1b') {
      this.onCancel?.();
      return;
    }

    if (data === '\r' || data === '\n') {
      const session = this.sessions[this.selectedIndex];
      if (session) this.onSelect?.(session);
      return;
    }

    if (data === '\x1b[A' || data === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      return;
    }

    if (data === '\x1b[B' || data === 'down') {
      this.selectedIndex = Math.min(this.sessions.length - 1, this.selectedIndex + 1);
      return;
    }
  }

  clearCache(): void {
    // No cache
  }
}
