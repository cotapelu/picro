/**
 * Config Selector Component
 * Edit configuration values
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base.js';

export interface ConfigItem {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
}

export interface ConfigSelectorOptions {
  items: ConfigItem[];
  onChange?: (item: ConfigItem) => void;
  onCancel?: () => void;
}

export class ConfigSelector implements UIElement, InteractiveElement {
  private items: ConfigItem[];
  private selectedIndex: number = 0;
  private onChange?: (item: ConfigItem) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: ConfigSelectorOptions) {
    this.items = options.items;
    this.onChange = options.onChange;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Config Editor ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.items.length && i < context.height - 6; i++) {
      const item = this.items[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const line = prefix + item.key + ' = ' + String(item.value);
      lines.push('│' + line + ' '.repeat(borderWidth - line.length) + '│');
    }

    while (lines.length < context.height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = '↑↓ navigate  Esc cancel';
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

    if (data === '\x1b[A' || data === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      return;
    }

    if (data === '\x1b[B' || data === 'down') {
      this.selectedIndex = Math.min(this.items.length - 1, this.selectedIndex + 1);
      return;
    }
  }

  clearCache(): void {
    // No cache
  }
}
