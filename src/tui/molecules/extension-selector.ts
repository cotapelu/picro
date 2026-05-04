/**
 * Extension Selector Component
 * Interactive list for selecting and managing extensions
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base';

export interface ExtensionInfo {
  id: string;
  name: string;
  enabled: boolean;
}

export interface ExtensionSelectorOptions {
  extensions: ExtensionInfo[];
  onSelect?: (ext: ExtensionInfo) => void;
  onToggle?: (ext: ExtensionInfo, enabled: boolean) => void;
  onCancel?: () => void;
}

export class ExtensionSelector implements UIElement, InteractiveElement {
  private extensions: ExtensionInfo[];
  private selectedIndex: number = 0;
  private onSelect?: (ext: ExtensionInfo) => void;
  private onToggle?: (ext: ExtensionInfo, enabled: boolean) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: ExtensionSelectorOptions) {
    this.extensions = options.extensions;
    this.onSelect = options.onSelect;
    this.onToggle = options.onToggle;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Extensions ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.extensions.length && i < context.height - 6; i++) {
      const ext = this.extensions[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const status = ext.enabled ? '✓' : '○';
      lines.push('│' + prefix + status + ' ' + ext.name + ' '.repeat(Math.max(0, borderWidth - prefix.length - status.length - ext.name.length - 2)) + '│');
    }

    while (lines.length < context.height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = '↑↓ navigate  Space toggle  Esc cancel';
    lines.push('│ ' + help + ' '.repeat(Math.max(0, borderWidth - help.length - 2)) + '│');
    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    return lines;
  }

  handleKey(key: KeyEvent): void {
    const data = key.raw;
    if (data === '\x1b') { this.onCancel?.(); return; }
    if (data === '\r') { 
      const ext = this.extensions[this.selectedIndex];
      if (ext) this.onSelect?.(ext);
      return;
    }
    if (data === ' ') {
      const ext = this.extensions[this.selectedIndex];
      if (ext && this.onToggle) {
        ext.enabled = !ext.enabled;
        this.onToggle(ext, ext.enabled);
      }
      return;
    }
    if (data === '\x1b[A' || data === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    }
    if (data === '\x1b[B' || data === 'down') {
      this.selectedIndex = Math.min(this.extensions.length - 1, this.selectedIndex + 1);
    }
  }

  clearCache(): void { }
}
