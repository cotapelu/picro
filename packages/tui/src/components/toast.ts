/**
 * Toast Component
 * Popup notification messages (auto-dismiss)
 */
import type { UIElement, RenderContext } from './base.js';
import { visibleWidth, truncateText } from './internal-utils.js';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastTheme {
  infoBg: (s: string) => string;
  infoFg: (s: string) => string;
  successBg: (s: string) => string;
  successFg: (s: string) => string;
  warningBg: (s: string) => string;
  warningFg: (s: string) => string;
  errorBg: (s: string) => string;
  errorFg: (s: string) => string;
  dimColor: (s: string) => string;
  borderColor: (s: string) => string;
}

export const defaultTheme: ToastTheme = {
  infoBg: (s) => `\x1b[48;5;25m${s}\x1b[0m`,
  infoFg: (s) => `\x1b[97m${s}\x1b[0m`,
  successBg: (s) => `\x1b[48;5;28m${s}\x1b[0m`,
  successFg: (s) => `\x1b[97m${s}\x1b[0m`,
  warningBg: (s) => `\x1b[48;5;208m${s}\x1b[0m`,
  warningFg: (s) => `\x1b[30m${s}\x1b[0m`,
  errorBg: (s) => `\x1b[48;5;196m${s}\x1b[0m`,
  errorFg: (s) => `\x1b[97m${s}\x1b[0m`,
  dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
  borderColor: (s) => `\x1b[90m${s}\x1b[0m`,
};

export const icons: Record<ToastType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number; // milliseconds, 0 = infinite
  showProgress?: boolean;
  theme?: Partial<ToastTheme>;
  width?: number;
  onDismiss?: () => void;
}

/**
 * Toast - popup notification
 * 
 * @example
 * const toast = new Toast({
 *   message: 'File saved successfully',
 *   type: 'success',
 *   duration: 3000,
 * });
 * tui.showPanel(toast, { anchor: 'top-right' });
 */
export class Toast implements UIElement {
  private message: string;
  private type: ToastType;
  private duration: number;
  private showProgress: boolean;
  private theme: ToastTheme;
  private requestedWidth: number;
  private onDismiss?: () => void;
  
  private createdAt: number;
  private dismissed = false;

  constructor(options: ToastOptions) {
    this.message = options.message;
    this.type = options.type ?? 'info';
    this.duration = options.duration ?? 5000;
    this.showProgress = options.showProgress ?? true;
    this.theme = { ...defaultTheme, ...options.theme };
    this.requestedWidth = options.width ?? 40;
    this.onDismiss = options.onDismiss;
    this.createdAt = Date.now();
  }

  /**
   * Check if toast should be dismissed
   */
  isExpired(): boolean {
    if (this.duration === 0) return false;
    return Date.now() - this.createdAt >= this.duration;
  }

  /**
   * Get remaining time percentage (0-100)
   */
  getRemainingPercent(): number {
    if (this.duration === 0) return 100;
    const elapsed = Date.now() - this.createdAt;
    return Math.max(0, Math.min(100, 100 - (elapsed / this.duration) * 100));
  }

  /**
   * Manually dismiss
   */
  dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;
    this.onDismiss?.();
  }

  /**
   * Update message
   */
  setMessage(message: string): void {
    this.message = message;
  }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    if (this.dismissed) return [];
    
    const width = Math.min(this.requestedWidth, context.width - 4);
    const contentWidth = width - 4;
    const lines: string[] = [];

    const bgFn = this.theme[`${this.type}Bg`];
    const fgFn = this.theme[`${this.type}Fg`];

    // Top border
    lines.push(this.theme.borderColor('┌' + '─'.repeat(width - 2) + '┐'));

    // Icon + message line
    const icon = icons[this.type];
    const msgText = truncateText(this.message, contentWidth - 3, '…');
    const padded = (icon + ' ' + msgText).padEnd(contentWidth);
    lines.push(this.theme.borderColor('│ ') + bgFn(fgFn(padded)) + this.theme.borderColor(' │'));

    // Progress bar if enabled and duration > 0
    if (this.showProgress && this.duration > 0) {
      const remaining = this.getRemainingPercent();
      const barWidth = contentWidth;
      const filled = Math.floor((remaining / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      lines.push(this.theme.borderColor('│ ') + bgFn(fgFn(bar)) + this.theme.borderColor(' │'));
    }

    // Bottom border
    lines.push(this.theme.borderColor('└' + '─'.repeat(width - 2) + '┘'));

    return lines;
  }
}

/**
 * ToastManager - manage multiple toasts
 */
export class ToastManager {
  private toasts: Toast[] = [];
  private maxToasts = 5;

  /**
   * Add a new toast
   */
  add(toast: Toast): void {
    this.toasts.push(toast);
    // Remove oldest if exceeds max
    while (this.toasts.length > this.maxToasts) {
      const old = this.toasts.shift();
      old?.dismiss();
    }
  }

  /**
   * Remove expired toasts
   */
  cleanup(): void {
    const expired: Toast[] = [];
    const remaining: Toast[] = [];
    
    for (const toast of this.toasts) {
      if (toast.isExpired()) {
        expired.push(toast);
      } else {
        remaining.push(toast);
      }
    }
    
    this.toasts = remaining;
    expired.forEach(t => t.dismiss());
  }

  /**
   * Get all active toasts
   */
  getToasts(): readonly Toast[] {
    return this.toasts;
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this.toasts.forEach(t => t.dismiss());
    this.toasts = [];
  }

  /**
   * Count active toasts
   */
  count(): number {
    return this.toasts.length;
  }
}

/**
 * Create a quick toast
 */
export function createToast(message: string, type: ToastType = 'info', duration = 3000): Toast {
  return new Toast({ message, type, duration });
}

/**
 * Create a success toast
 */
export function successToast(message: string, duration = 3000): Toast {
  return createToast(message, 'success', duration);
}

/**
 * Create an error toast
 */
export function errorToast(message: string, duration = 5000): Toast {
  return createToast(message, 'error', duration);
}

/**
 * Create a warning toast
 */
export function warningToast(message: string, duration = 4000): Toast {
  return createToast(message, 'warning', duration);
}

/**
 * Create an info toast
 */
export function infoToast(message: string, duration = 3000): Toast {
  return createToast(message, 'info', duration);
}
