/**
 * Settings Selector Component
 * Interactive list for modifying settings
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base';
import { visibleWidth } from '../atoms/internal-utils';

export interface SettingsSelectorSettingItem {
  id: string;
  name: string;
  type: 'boolean' | 'string' | 'number';
  value: any;
}

export interface SettingsSelectorOptions {
  settings: SettingsSelectorSettingItem[];
  onChange?: (setting: SettingsSelectorSettingItem) => void;
  onCancel?: () => void;
}

export class SettingsSelector implements UIElement, InteractiveElement {
  private settings: SettingsSelectorSettingItem[];
  private selectedIndex: number = 0;
  private onChange?: (setting: SettingsSelectorSettingItem) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: SettingsSelectorOptions) {
    this.settings = options.settings;
    this.onChange = options.onChange;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Settings ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.settings.length && i < context.height - 6; i++) {
      const setting = this.settings[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const valueStr = String(setting.value);
      const line = prefix + setting.name + ' = ' + valueStr;
      lines.push('│' + line + ' '.repeat(borderWidth - line.length) + '│');
    }

    while (lines.length < context.height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = '↑↓ navigate  Space toggle  Esc cancel';
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
      this.selectedIndex = Math.min(this.settings.length - 1, this.selectedIndex + 1);
      return;
    }

    if (data === ' ') {
      const setting = this.settings[this.selectedIndex];
      if (setting && setting.type === 'boolean') {
        setting.value = !setting.value;
        this.onChange?.(setting);
      }
    }
  }

  clearCache(): void {
    // No cache
  }
}
