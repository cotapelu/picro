/**
 * Show Images Selector Component
 * Toggle image display in terminal
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from './base.js';

export interface ImageInfo {
  id: string;
  name: string;
}

export interface ShowImagesSelectorOptions {
  images: ImageInfo[];
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onCancel?: () => void;
}

export class ShowImagesSelector implements UIElement, InteractiveElement {
  private images: ImageInfo[];
  private enabled: boolean = false;
  private selectedIndex: number = 0;
  private onToggle?: (enabled: boolean) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: ShowImagesSelectorOptions) {
    this.images = options.images;
    this.enabled = options.enabled || false;
    this.onToggle = options.onToggle;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Image Display ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    const status = this.enabled ? '● Enabled' : '○ Disabled';
    lines.push('│ Display: ' + status + ' '.repeat(Math.max(0, borderWidth - 14 - status.length)) + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.images.length && i < context.height - 8; i++) {
      const img = this.images[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      lines.push('│' + prefix + '🖼 ' + img.name + ' '.repeat(Math.max(0, borderWidth - prefix.length - img.name.length - 4)) + '│');
    }

    while (lines.length < context.height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = 'Space toggle  Esc cancel';
    lines.push('│ ' + help + ' '.repeat(Math.max(0, borderWidth - help.length - 2)) + '│');
    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    return lines;
  }

  handleKey(key: KeyEvent): void {
    const data = key.raw;
    if (data === '\x1b') { this.onCancel?.(); return; }
    if (data === ' ') { 
      this.enabled = !this.enabled;
      this.onToggle?.(this.enabled);
      return;
    }
    if (data === '\x1b[A' || data === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    }
    if (data === '\x1b[B' || data === 'down') {
      this.selectedIndex = Math.min(this.images.length - 1, this.selectedIndex + 1);
    }
  }

  clearCache(): void { }
}
