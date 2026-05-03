/**
 * Modal/Dialog Component
 * Modal dialog for confirmations and forms
 */
import type { UIElement, RenderContext, KeyEvent, InteractiveElement } from '../atoms/base.js';
import { visibleWidth, truncateText, wrapText } from '../atoms/internal-utils.js';

export type ModalType = 'confirm' | 'info' | 'warning' | 'error' | 'custom';

export interface ModalButton {
  label: string;
  value: string;
  primary?: boolean;
  destructive?: boolean;
}

export interface ModalTheme {
  bgColor: (s: string) => string;
  fgColor: (s: string) => string;
  borderColor: (s: string) => string;
  headerColor: (s: string) => string;
  headerBg: (s: string) => string;
  primaryButton: (s: string) => string;
  secondaryButton: (s: string) => string;
  destructiveButton: (s: string) => string;
  dimColor: (s: string) => string;
  accentColor: (s: string) => string;
}

export const modalDefaultTheme: ModalTheme = {
  bgColor: (s) => `\x1b[48;5;235m${s}\x1b[0m`,
  fgColor: (s) => `\x1b[37m${s}\x1b[0m`,
  borderColor: (s) => `\x1b[90m${s}\x1b[0m`,
  headerColor: (s) => `\x1b[1;97m${s}\x1b[0m`,
  headerBg: (s) => `\x1b[48;5;25m${s}\x1b[0m`,
  primaryButton: (s) => `\x1b[48;5;33m\x1b[97m${s}\x1b[0m`,
  secondaryButton: (s) => `\x1b[48;5;240m\x1b[37m${s}\x1b[0m`,
  destructiveButton: (s) => `\x1b[48;5;196m\x1b[97m${s}\x1b[0m`,
  dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
  accentColor: (s) => `\x1b[36m${s}\x1b[0m`,
};

export const modalIcons: Record<ModalType, string> = {
  confirm: '❓',
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  custom: '💬',
};

export interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  buttons?: ModalButton[];
  theme?: Partial<ModalTheme>;
  width?: number;
  onResult?: (value: string) => void;
  onCancel?: () => void;
}

/**
 * Modal - dialog box for user interaction
 * 
 * @example
 * const modal = new Modal({
 *   title: 'Delete File?',
 *   message: 'This action cannot be undone.',
 *   type: 'confirm',
 *   buttons: [
 *     { label: 'Cancel', value: 'cancel' },
 *     { label: 'Delete', value: 'delete', destructive: true, primary: true },
 *   ],
 *   onResult: (val) => console.log('User chose:', val),
 * });
 * tui.showPanel(modal, { anchor: 'center' });
 */
export class Modal implements UIElement, InteractiveElement {
  private title: string;
  private message: string;
  private type: ModalType;
  private buttons: ModalButton[];
  private theme: ModalTheme;
  private requestedWidth: number;
  private onResult?: (value: string) => void;
  private onCancel?: () => void;
  
  private selectedIndex = 0;
  public isFocused = true;

  constructor(options: ModalOptions) {
    this.title = options.title;
    this.message = options.message;
    this.type = options.type ?? 'info';
    this.buttons = options.buttons ?? this.getDefaultButtons();
    this.theme = { ...modalDefaultTheme, ...options.theme };
    this.requestedWidth = options.width ?? 50;
    this.onResult = options.onResult;
    this.onCancel = options.onCancel;
  }

  private getDefaultButtons(): ModalButton[] {
    switch (this.type) {
      case 'confirm':
        return [
          { label: 'Cancel', value: 'cancel' },
          { label: 'OK', value: 'ok', primary: true },
        ];
      case 'error':
      case 'warning':
        return [{ label: 'OK', value: 'ok', primary: true }];
      default:
        return [{ label: 'OK', value: 'ok', primary: true }];
    }
  }

  /**
   * Move button selection left
   */
  private moveLeft(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
    }
  }

  /**
   * Move button selection right
   */
  private moveRight(): void {
    if (this.selectedIndex < this.buttons.length - 1) {
      this.selectedIndex++;
    }
  }

  /**
   * Confirm current selection
   */
  private confirm(): void {
    const button = this.buttons[this.selectedIndex];
    if (button) {
      this.onResult?.(button.value);
    }
  }

  handleKey(event: KeyEvent): void {
    const key = event.name;

    switch (key) {
      case 'ArrowLeft':
      case 'h':
        this.moveLeft();
        break;
      case 'ArrowRight':
      case 'l':
        this.moveRight();
        break;
      case 'Enter':
      case 'return':
        this.confirm();
        break;
      case 'Escape':
        this.onCancel?.();
        break;
      case 'Tab':
        // Cycle through buttons
        this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
        break;
    }
  }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    const width = Math.min(this.requestedWidth, context.width - 4);
    const contentWidth = width - 4;
    const lines: string[] = [];

    // Top border with rounded corners
    lines.push(this.theme.borderColor('┌' + '─'.repeat(width - 2) + '┐'));

    // Title bar
    const icon = modalIcons[this.type];
    const titleText = `${icon} ${this.title}`;
    const titlePadded = titleText.padStart((width + titleText.length) / 2).padEnd(width);
    lines.push(this.theme.borderColor('│') + this.theme.headerBg(this.theme.headerColor(titlePadded)) + this.theme.borderColor('│'));

    // Separator
    lines.push(this.theme.borderColor('├' + '─'.repeat(width - 2) + '┤'));

    // Message content (wrapped)
    const wrapped = wrapText(this.message, contentWidth - 2);
    for (const line of wrapped) {
      const padded = (' ' + line).padEnd(contentWidth);
      lines.push(this.theme.borderColor('│ ') + this.theme.bgColor(this.theme.fgColor(padded)) + this.theme.borderColor(' │'));
    }

    // Spacer
    lines.push(this.theme.borderColor('│ ') + ' '.repeat(contentWidth) + this.theme.borderColor(' │'));

    // Buttons row - centered
    const buttonRow = this.renderButtons(contentWidth);
    lines.push(this.theme.borderColor('│ ') + buttonRow + this.theme.borderColor(' │'));

    // Bottom border
    lines.push(this.theme.borderColor('└' + '─'.repeat(width - 2) + '┘'));

    return lines;
  }

  private renderButtons(availableWidth: number): string {
    // Calculate button widths
    const buttonTexts = this.buttons.map((b, i) => {
      const marker = i === this.selectedIndex ? `▶ ${b.label} ◀` : `  ${b.label}  `;
      return marker;
    });

    const totalButtonWidth = buttonTexts.reduce((sum, t) => sum + visibleWidth(t) + 2, 0);
    const spacing = Math.max(2, Math.floor((availableWidth - totalButtonWidth) / (this.buttons.length + 1)));

    let result = '';
    let currentX = spacing;

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i]!;
      const text = buttonTexts[i]!;
      const isSelected = i === this.selectedIndex;

      // Style based on button type
      let styled: string;
      if (isSelected) {
        if (btn.destructive) {
          styled = this.theme.destructiveButton(text);
        } else if (btn.primary) {
          styled = this.theme.primaryButton(text);
        } else {
          styled = this.theme.secondaryButton(text);
        }
      } else {
        styled = this.theme.dimColor(text);
      }

      // Add left padding
      if (currentX > result.length) {
        result += ' '.repeat(currentX - result.length);
      }

      result += styled;
      currentX += visibleWidth(text) + spacing;
    }

    // Pad to full width
    const finalWidth = visibleWidth(result);
    if (finalWidth < availableWidth) {
      result += ' '.repeat(availableWidth - finalWidth);
    } else if (finalWidth > availableWidth) {
      result = truncateText(result, availableWidth, '…');
    }

    return result.padEnd(availableWidth);
  }
}

/**
 * Quick confirm dialog
 */
export function confirmDialog(
  title: string,
  message: string,
  onResult: (confirmed: boolean) => void,
  options: { destructive?: boolean; theme?: Partial<ModalTheme> } = {}
): Modal {
  return new Modal({
    title,
    message,
    type: 'confirm',
    buttons: [
      { label: 'Cancel', value: 'cancel' },
      { label: options.destructive ? 'Delete' : 'OK', value: 'ok', primary: true, destructive: options.destructive },
    ],
    onResult: (val) => onResult(val === 'ok'),
    theme: options.theme,
  });
}

/**
 * Quick alert dialog
 */
export function alertDialog(
  title: string,
  message: string,
  onClose?: () => void,
  options: { type?: ModalType; theme?: Partial<ModalTheme> } = {}
): Modal {
  return new Modal({
    title,
    message,
    type: options.type ?? 'info',
    buttons: [{ label: 'OK', value: 'ok', primary: true }],
    onResult: () => onClose?.(),
    onCancel: () => onClose?.(),
    theme: options.theme,
  });
}
