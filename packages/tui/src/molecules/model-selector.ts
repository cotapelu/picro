/**
 * Model Selector Component
 * Interactive list for selecting LLM models
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base.js';
import { visibleWidth, truncateText } from '../atoms/internal-utils.js';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
}

export interface ModelSelectorOptions {
  models: ModelInfo[];
  onSelect?: (model: ModelInfo) => void;
  onCancel?: () => void;
}

export class ModelSelector implements UIElement, InteractiveElement {
  private models: ModelInfo[];
  private selectedIndex: number = 0;
  private onSelect?: (model: ModelInfo) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: ModelSelectorOptions) {
    this.models = options.models;
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Select Model ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.models.length && i < context.height - 6; i++) {
      const model = this.models[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const ctxStr = model.contextWindow >= 1000000 ? (model.contextWindow / 1000000) + 'M' : (model.contextWindow / 1000) + 'K';
      const line = prefix + model.name + ' [' + model.provider + '] ' + ctxStr;
      lines.push('│' + truncateText(line, borderWidth) + ' '.repeat(Math.max(0, borderWidth - visibleWidth(line))) + '│');
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
