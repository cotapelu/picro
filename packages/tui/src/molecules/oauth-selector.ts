/**
 * OAuth Selector Component
 * OAuth provider selection for authentication
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base.js';
import { visibleWidth } from '../atoms/internal-utils.js';

export interface OAuthProvider {
  id: string;
  name: string;
}

export interface OAuthSelectorOptions {
  providers?: OAuthProvider[];
  onSelect?: (provider: OAuthProvider) => void;
  onCancel?: () => void;
}

export class OAuthSelector implements UIElement, InteractiveElement {
  private providers: OAuthProvider[];
  private selectedIndex: number = 0;
  private onSelect?: (provider: OAuthProvider) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: OAuthSelectorOptions = {}) {
    this.providers = options.providers || [
      { id: 'anthropic', name: 'Anthropic' },
      { id: 'openai', name: 'OpenAI' },
      { id: 'google', name: 'Google' },
    ];
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Select OAuth Provider ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.providers.length && i < context.height - 6; i++) {
      const provider = this.providers[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const line = prefix + provider.name;
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

  handleKey(key: KeyEvent): void {
    const data = key.raw;

    if (data === '\x1b') {
      this.onCancel?.();
      return;
    }

    if (data === '\r' || data === '\n') {
      const provider = this.providers[this.selectedIndex];
      if (provider) this.onSelect?.(provider);
      return;
    }

    if (data === '\x1b[A' || data === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      return;
    }

    if (data === '\x1b[B' || data === 'down') {
      this.selectedIndex = Math.min(this.providers.length - 1, this.selectedIndex + 1);
      return;
    }
  }

  clearCache(): void {
    // No cache
  }
}
