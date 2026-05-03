/**
 * Extension Editor Component
 * Code editor for extension files
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base.js';
import { CURSOR_MARKER } from '../atoms/base.js';

export interface ExtensionEditorOptions {
  content?: string;
  language?: string;
  onSave?: (content: string) => void;
  onCancel?: () => void;
}

export class ExtensionEditor implements UIElement, InteractiveElement {
  private content: string;
  private language: string;
  private cursorLine: number = 0;
  private cursorCol: number = 0;
  private onSave?: (content: string) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: ExtensionEditorOptions = {}) {
    this.content = options.content || '';
    this.language = options.language || 'typescript';
    this.onSave = options.onSave;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const height = context.height;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Extension Editor [' + this.language + '] ';
    const titlePad = ' '.repeat(Math.max(0, borderWidth - title.length));
    lines.push('│' + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    const contentLines = this.content.split('\n');
    for (let i = 0; i < height - 6 && i < contentLines.length; i++) {
      const lineNum = String(i + 1).padStart(4);
      let line = lineNum + ' │ ' + contentLines[i];
      if (i === this.cursorLine) {
        const cursorPos = 7 + this.cursorCol;
        if (cursorPos < line.length) {
          line = line.slice(0, cursorPos) + CURSOR_MARKER + line.slice(cursorPos);
        }
      }
      lines.push('│' + line.slice(0, borderWidth) + ' '.repeat(Math.max(0, borderWidth - line.length)) + '│');
    }

    while (lines.length < height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const info = 'Lines: ' + contentLines.length + ' | Col: ' + (this.cursorCol + 1);
    lines.push('│' + info + ' '.repeat(Math.max(0, borderWidth - info.length)) + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = 'Ctrl+S save  Esc cancel';
    lines.push('│ ' + help + ' '.repeat(Math.max(0, borderWidth - help.length - 2)) + '│');
    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    return lines;
  }

  handleKey(key: KeyEvent): void {
    const data = key.raw;
    if (data === '\x1b') { this.onCancel?.(); return; }
    if (data === '\x13') { this.onSave?.(this.content); return; }
    if (data === '\r' || data === '\n') {
      const lines = this.content.split('\n');
      const before = lines.slice(0, this.cursorLine).join('\n');
      const current = lines[this.cursorLine] || '';
      const after = lines.slice(this.cursorLine + 1).join('\n');
      this.content = before + '\n' + current + after;
      this.cursorLine++;
      this.cursorCol = 0;
      return;
    }
    if (data === '\x7f' || data === '\b') {
      const lines = this.content.split('\n');
      lines[this.cursorLine] = (lines[this.cursorLine] || '').slice(0, -1);
      this.content = lines.join('\n');
      return;
    }
    if (data.length === 1 && !data.startsWith('\x1b')) {
      const lines = this.content.split('\n');
      lines[this.cursorLine] = (lines[this.cursorLine] || '') + data;
      this.content = lines.join('\n');
      this.cursorCol++;
    }
  }

  clearCache(): void { }
}
