/**
 * Theme Selector Component
 * Interactive list for selecting themes
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base.js';
import { visibleWidth, truncateText } from '../atoms/internal-utils.js';

export interface ThemeInfo {
  id: string;
  name: string;
  background: string;
  foreground: string;
}

export interface ThemeSelectorOptions {
  themes?: ThemeInfo[];
  currentThemeId?: string;
  onSelect?: (theme: ThemeInfo) => void;
  onCancel?: () => void;
}

export class ThemeSelector implements UIElement, InteractiveElement {
  private themes: ThemeInfo[];
  private currentThemeId: string;
  private selectedIndex: number = 0;
  private onSelect?: (theme: ThemeInfo) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: ThemeSelectorOptions) {
    this.themes = options.themes || [
      { id: 'dark', name: 'Dark', background: '#1e1e1e', foreground: '#ffffff' },
      { id: 'light', name: 'Light', background: '#ffffff', foreground: '#000000' },
    ];
    this.currentThemeId = options.currentThemeId || 'dark';
    this.selectedIndex = this.themes.findIndex(t => t.id === this.currentThemeId);
    if (this.selectedIndex < 0) this.selectedIndex = 0;
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Select Theme ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.themes.length && i < context.height - 6; i++) {
      const theme = this.themes[i]!;
      const isSelected = i === this.selectedIndex;
      const isCurrent = theme.id === this.currentThemeId;
      const prefix = isSelected ? '▶ ' : '  ';
      const currentMark = isCurrent ? ' ●' : '';
      const line = prefix + theme.name + currentMark;
      lines.push('│' + line + ' '.repeat(borderWidth - line.length) + '│');
    }

    while (lines.length < context.height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = '↑↓ select  Enter apply  Esc cancel';
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
      const theme = this.themes[this.selectedIndex];
      if (theme) this.onSelect?.(theme);
      return;
    }

    if (data === '\x1b[A' || data === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      return;
    }

    if (data === '\x1b[B' || data === 'down') {
      this.selectedIndex = Math.min(this.themes.length - 1, this.selectedIndex + 1);
      return;
    }
  }

  clearCache(): void {
    // No cache
  }
}
