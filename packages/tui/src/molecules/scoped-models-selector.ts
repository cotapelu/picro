/**
 * Scoped Models Selector Component
 * Select models with scope restrictions
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base.js';
import { visibleWidth, truncateText } from '../atoms/internal-utils.js';

export interface ScopedModelInfo {
  id: string;
  name: string;
  provider: string;
  scope: 'user' | 'project' | 'global';
}

export interface ScopedModelsSelectorOptions {
  models: ScopedModelInfo[];
  onSelect?: (model: ScopedModelInfo) => void;
  onCancel?: () => void;
}

export class ScopedModelsSelector implements UIElement, InteractiveElement {
  private models: ScopedModelInfo[];
  private selectedIndex: number = 0;
  private onSelect?: (model: ScopedModelInfo) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: ScopedModelsSelectorOptions) {
    this.models = options.models;
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Scoped Models ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.models.length && i < context.height - 6; i++) {
      const model = this.models[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const scope = '[' + model.scope + ']';
      const line = prefix + scope + ' ' + truncateText(model.name, 25);
      lines.push('│' + line + ' '.repeat(borderWidth - line.length) + '│');
    }

    while (lines.length < context.height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = '↑↓ select  Enter select  Esc cancel';
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
      const model = this.models[this.selectedIndex];
      if (model) this.onSelect?.(model);
      return;
    }

    if (data === '\x1b[A' || data === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      return;
    }

    if (data === '\x1b[B' || data === 'down') {
      this.selectedIndex = Math.min(this.models.length - 1, this.selectedIndex + 1);
      return;
    }
  }

  clearCache(): void {
    // No cache
  }
}
