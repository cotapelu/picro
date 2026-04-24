#!/usr/bin/env node
/**
 * InputBox Component
 * Single-line text input with callbacks
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '@picro/tui';

export class InputBox implements UIElement, InteractiveElement {
  private prompt: string;
  private value: string = '';
  private cursorPos = 0;
  private onEnter: (value: string) => void;
  private onCancel: () => void;
  private theme: any;

  constructor(prompt: string, onEnter: (value: string) => void, onCancel: () => void, theme: any) {
    this.prompt = prompt;
    this.onEnter = onEnter;
    this.onCancel = onCancel;
    this.theme = theme;
  }

  get isFocused(): boolean { return this._isFocused; }
  set isFocused(v: boolean) { this._isFocused = v; }
  private _isFocused = false;

  draw(context: RenderContext): string[] {
    const display = this.prompt + this.value;
    const line = this.theme.accent + display + this.theme.reset;
    return [line.slice(0, context.width)];
  }

  handleKey?(key: KeyEvent): void {
    const d = key.raw;
    if (d === '\x03') { this.onCancel(); return; }
    if (key.name === 'Enter' || d === '\r') {
      this.onEnter(this.value);
      return;
    }
    if (key.name === 'Backspace' || d === '\x7f') {
      if (this.cursorPos > 0) {
        this.value = this.value.slice(0, this.cursorPos-1) + this.value.slice(this.cursorPos);
        this.cursorPos--;
      }
      return;
    }
    if (key.name === 'ArrowLeft') { this.cursorPos = Math.max(0, this.cursorPos-1); return; }
    if (key.name === 'ArrowRight') { this.cursorPos = Math.min(this.value.length, this.cursorPos+1); return; }
    if (key.name === 'Home') { this.cursorPos = 0; return; }
    if (key.name === 'End') { this.cursorPos = this.value.length; return; }
    if (d.length === 1 && d.charCodeAt(0) >= 32 && d.charCodeAt(0) <= 126) {
      this.value = this.value.slice(0, this.cursorPos) + d + this.value.slice(this.cursorPos);
      this.cursorPos++;
    }
  }

  clearCache(): void {
    // no-op
  }
}
