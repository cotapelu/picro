/**
 * Login Dialog Component
 * Dialog for entering API key and authentication
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base.js';
import { CURSOR_MARKER } from '../atoms/base.js';
import { visibleWidth, truncateText } from '../atoms/internal-utils.js';

export interface LoginDialogOptions {
  provider?: string;
  title?: string;
  onSubmit?: (apiKey: string) => void;
  onCancel?: () => void;
}

export class LoginDialog implements UIElement, InteractiveElement {
  private provider: string;
  private title: string;
  private apiKey: string = '';
  private cursorBlink: boolean = true;
  private cursorPos: number = 0;
  private stage: 'provider' | 'input' = 'provider';
  private onSubmit?: (apiKey: string) => void;
  private onCancel?: () => void;

  public isFocused = false;

  constructor(options: LoginDialogOptions = {}) {
    this.provider = options.provider || 'anthropic';
    this.title = options.title || 'Login';
    this.onSubmit = options.onSubmit;
    this.onCancel = options.onCancel;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    
    const titleText = ' ' + this.title + ' ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - titleText.length) / 2)));
    lines.push('│' + titlePad + titleText + titlePad + '│');
    
    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    
    const providerLabel = 'Provider: ' + this.provider;
    lines.push('│ ' + providerLabel + ' '.repeat(borderWidth - providerLabel.length - 1) + '│');
    
    lines.push('│' + ' '.repeat(borderWidth) + '│');
    
    const inputLabel = 'API Key: ';
    const maskedKey = '*'.repeat(this.apiKey.length);
    const displayKey = this.stage === 'input' ? maskedKey : '(press Enter to enter)';
    const inputLine = inputLabel + displayKey;
    const inputDisplay = inputLine + (this.isFocused && this.stage === 'input' ? (this.cursorBlink ? '█' : '_') : '');
    
    lines.push('│ ' + inputDisplay + ' '.repeat(borderWidth - inputDisplay.length - 1) + '│');

    for (let i = lines.length; i < context.height - 3; i++) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const helpText = 'Enter: submit  Esc: cancel';
    lines.push('│ ' + helpText + ' '.repeat(borderWidth - helpText.length - 2) + '│');
    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    this.cursorBlink = !this.cursorBlink;
    return lines;
  }

  handleKey(key: KeyEvent): void {
    const data = key.raw;

    if (data === '\r' || data === '\n') {
      if (this.stage === 'provider') {
        this.stage = 'input';
      } else {
        this.onSubmit?.(this.apiKey);
      }
      return;
    }

    if (data === '\x1b') {
      this.onCancel?.();
      return;
    }

    if (data === '\x7f' || data === '\b') {
      if (this.apiKey.length > 0) {
        this.apiKey = this.apiKey.slice(0, -1);
        this.cursorPos = Math.max(0, this.cursorPos - 1);
      }
      return;
    }

    if (this.stage === 'input' && data.length === 1 && !data.startsWith('\x1b')) {
      this.apiKey += data;
      this.cursorPos++;
    }
  }

  clearCache(): void {
    // No cache
  }
}
