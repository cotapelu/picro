/**
 * User Message Selector Component
 * Select and edit user messages
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from './base.js';

export interface UserMessageInfo {
  id: string;
  content: string;
}

export interface UserMessageSelectorOptions {
  messages: UserMessageInfo[];
  onSelect?: (message: UserMessageInfo) => void;
  onCancel?: () => void;
}

export class UserMessageSelector implements UIElement, InteractiveElement {
  private messages: UserMessageInfo[];
  private selectedIndex: number = 0;
  private onSelect?: (message: UserMessageInfo) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: UserMessageSelectorOptions) {
    this.messages = options.messages;
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Select Message ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.messages.length && i < context.height - 6; i++) {
      const msg = this.messages[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const content = msg.content.slice(0, 50);
      lines.push('│' + prefix + content + ' '.repeat(Math.max(0, borderWidth - prefix.length - content.length)) + '│');
    }

    while (lines.length < context.height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = '↑↓ select  Enter edit  Esc cancel';
    lines.push('│ ' + help + ' '.repeat(Math.max(0, borderWidth - help.length - 2)) + '│');
    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    return lines;
  }

  handleKey(key: KeyEvent): void {
    const data = key.raw;
    if (data === '\x1b') { this.onCancel?.(); return; }
    if (data === '\r') { 
      const msg = this.messages[this.selectedIndex];
      if (msg) this.onSelect?.(msg);
      return;
    }
    if (data === '\x1b[A' || data === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    }
    if (data === '\x1b[B' || data === 'down') {
      this.selectedIndex = Math.min(this.messages.length - 1, this.selectedIndex + 1);
    }
  }

  clearCache(): void { }
}
