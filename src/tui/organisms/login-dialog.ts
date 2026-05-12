/**
 * Login Dialog Component
 * Dialog for entering API key and authentication
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base';
import { CURSOR_MARKER } from '../atoms/base';
import { visibleWidth, truncateText } from '../atoms/internal-utils';
import { Input } from '../molecules/input';

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
  private input: Input;

  constructor(options: LoginDialogOptions = {}) {
    this.provider = options.provider || 'anthropic';
    this.title = options.title || 'Login';
    this.onSubmit = options.onSubmit;
    this.onCancel = options.onCancel;
    // Reuse Input molecule for text input
    this.input = new Input({
      placeholder: 'Enter API key...',
      onCancel: () => this.onCancel?.(),
    });
  }

  getApiKey(): string {
    return this.apiKey;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  draw(context: RenderContext): string[] {
    const width = Math.max(2, context.width); // ensure at least 2 to avoid negative repeats
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    
    const titleText = ' ' + this.title + ' ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - titleText.length) / 2)));
    lines.push('│' + titlePad + titleText + titlePad + '│');
    
    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    
    const providerLabel = 'Provider: ' + this.provider;
    const providerPad = Math.max(0, borderWidth - providerLabel.length - 1);
    lines.push('│ ' + providerLabel + ' '.repeat(providerPad) + '│');
    
    lines.push('│' + ' '.repeat(borderWidth) + '│');
    
    const inputLabel = 'API Key: ';
    const maskedKey = '*'.repeat(this.apiKey.length);
    const displayKey = this.stage === 'input' ? maskedKey : '(press Enter to enter)';
    let inputDisplay = inputLabel + displayKey;
    if (this.isFocused && this.stage === 'input') {
      inputDisplay += this.cursorBlink ? '█' : '_';
    }
    const inputPad = Math.max(0, borderWidth - inputDisplay.length - 1);
    const prefix = (this.isFocused && this.stage === 'input') ? CURSOR_MARKER : '';
    lines.push('│ ' + prefix + inputDisplay + ' '.repeat(inputPad) + '│');

    for (let i = lines.length; i < context.height - 3; i++) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const helpText = 'Enter: submit  Esc: cancel';
    const helpPad = Math.max(0, borderWidth - helpText.length - 2);
    lines.push('│ ' + helpText + ' '.repeat(helpPad) + '│');
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

    if (this.stage === 'input' && !data.startsWith('\x1b')) {
      // Accept printable characters (including emojis). Ignore control chars.
      const code = data.charCodeAt(0);
      if (code >= 32) { // space (32) and above
        this.apiKey += data;
        this.cursorPos++;
      }
      return;
    }
  }

  clearCache(): void {
    // No cache
  }
}
