/**
 * Extension Input Component
 * Input for extension-defined values
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from './base.js';

export interface ExtensionInputOptions {
  label?: string;
  defaultValue?: string;
  onSubmit?: (value: string) => void;
  onCancel?: () => void;
}

export class ExtensionInput implements UIElement, InteractiveElement {
  private label: string;
  private value: string = '';
  private cursorBlink = true;
  private onSubmit?: (value: string) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: ExtensionInputOptions = {}) {
    this.label = options.label || 'Input';
    this.value = options.defaultValue || '';
    this.onSubmit = options.onSubmit;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' ' + this.label + ' ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    const display = this.value + (this.isFocused && this.cursorBlink ? '█' : '_');
    lines.push('│ ' + display + ' '.repeat(Math.max(0, borderWidth - display.length - 1)) + '│');

    while (lines.length < context.height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = 'Enter submit  Esc cancel';
    lines.push('│ ' + help + ' '.repeat(Math.max(0, borderWidth - help.length - 2)) + '│');
    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    this.cursorBlink = !this.cursorBlink;
    return lines;
  }

  handleKey(key: KeyEvent): void {
    const data = key.raw;
    if (data === '\r' || data === '\n') { this.onSubmit?.(this.value); return; }
    if (data === '\x1b') { this.onCancel?.(); return; }
    if (data === '\x7f' || data === '\b') { this.value = this.value.slice(0, -1); return; }
    if (data.length === 1 && !data.startsWith('\x1b')) { this.value += data; }
  }

  clearCache(): void { }
}
