/**
 * CancellableLoader Component
 * Loading spinner with progress indicator and abort capability
 */
import type { UIElement, RenderContext, KeyEvent, InteractiveElement } from '../tui.js';
import { CURSOR_MARKER } from '../tui.js';
import { BorderedLoader } from './loader.js';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export interface CancellableLoaderOptions {
  /** Initial message */
  message: string;
  /** Theme colors */
  theme?: {
    spinnerColor: (str: string) => string;
    textColor: (str: string) => string;
    dimColor: (str: string) => string;
  };
  /** Called when user presses Escape */
  onAbort?: () => void;
}

/**
 * CancellableLoader - Loading indicator with cancel support
 * 
 * Extends basic loader with an AbortSignal that can be used to cancel
 * async operations. User can press Escape to trigger cancellation.
 * 
 * @example
 * const loader = new CancellableLoader({
 *   message: 'Processing...',
 *   theme: { ... },
 *   onAbort: () => console.log('Cancelled!')
 * });
 * 
 * // Use AbortSignal with fetch or other async operations
 * fetch(url, { signal: loader.signal })
 *   .then(() => loader.dispose())
 *   .catch(err => {
 *     if (loader.aborted) console.log('Request was cancelled');
 *   });
 */
export class CancellableLoader implements UIElement, InteractiveElement {
  protected message: string;
  protected theme: Required<NonNullable<CancellableLoaderOptions['theme']>>;
  private onAbort?: () => void;
  private abortController: AbortController;
  private spinnerIndex = 0;
  private spinnerInterval: ReturnType<typeof setInterval> | undefined;
  private disposed = false;

  public isFocused = false;

  constructor(options: CancellableLoaderOptions) {
    this.message = options.message;
    this.onAbort = options.onAbort;
    this.abortController = new AbortController();

    // Default theme
    this.theme = options.theme ?? {
      spinnerColor: (s) => `\x1b[36m${s}\x1b[0m`,     // Cyan
      textColor: (s) => `\x1b[37m${s}\x1b[0m`,       // White
      dimColor: (s) => `\x1b[90m${s}\x1b[0m`,        // Gray
    };

    // Start spinner animation
    this.startAnimation();
  }

  /**
   * Start spinner animation
   */
  private startAnimation(): void {
    this.spinnerInterval = setInterval(() => {
      if (this.disposed) return;
      this.spinnerIndex = (this.spinnerIndex + 1) % SPINNER_FRAMES.length;
    }, 80);
  }

  /**
   * AbortSignal that becomes aborted when user cancels
   */
  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Check if loader was aborted
   */
  get aborted(): boolean {
    return this.abortController.signal.aborted;
  }

  /**
   * Update the loading message
   */
  setMessage(message: string): void {
    this.message = message;
  }

  /**
   * Trigger abort manually
   */
  abort(): void {
    if (this.abortController.signal.aborted) return;
    this.abortController.abort();
    this.onAbort?.();
    this.dispose();
  }

  /** 
   * Handle key input - Escape to cancel
   */
  handleKey(event: KeyEvent): void {
    if (event.name === 'Escape' || event.raw === '\x03') {
      this.abort();
    }
  }

  draw(context: RenderContext): string[] {
    const width = Math.min(context.width, 80);
    const availableWidth = Math.max(20, width - 10);
    
    // Truncate message if too long
    let displayMessage = this.message;
    if (displayMessage.length > availableWidth) {
      displayMessage = displayMessage.slice(0, availableWidth - 3) + '...';
    }

    const frame = SPINNER_FRAMES[this.spinnerIndex];
    const spinner = this.theme.spinnerColor(frame);
    const text = this.theme.textColor(displayMessage);
    const dimHint = this.theme.dimColor('(Press Esc to cancel)');

    const lines: string[] = [];
    
    // Top border
    lines.push('┌' + '─'.repeat(width - 2) + '┐');
    
    // Spinner line
    const spinnerLine = ` ${spinner} ${text}`;
    const paddedLine = spinnerLine.padEnd(width - 2);
    lines.push('│' + paddedLine + '│');
    
    // Empty line
    lines.push('│' + ' '.repeat(width - 2) + '│');
    
    // Hint line
    const hintLine = ` ${dimHint}`.padEnd(width - 2);
    lines.push('│' + hintLine + '│');
    
    // Bottom border
    lines.push('└' + '─'.repeat(width - 2) + '┘');

    // Add cursor marker if focused
    if (this.isFocused) {
      lines[1] = CURSOR_MARKER + lines[1];
    }

    return lines;
  }

  clearCache(): void {
    // No cache to clear
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = undefined;
    }
    
    if (!this.abortController.signal.aborted) {
      this.abortController.abort();
    }
  }
}

/**
 * ProgressLoader - Loading indicator with progress bar
 * Similar to CancellableLoader but shows progress percentage
 */
export interface ProgressLoaderOptions extends CancellableLoaderOptions {
  /** Initial progress (0-100) */
  initialProgress?: number;
}

export class ProgressLoader extends CancellableLoader {
  private progress: number;

  constructor(options: ProgressLoaderOptions) {
    super(options);
    this.progress = Math.max(0, Math.min(100, options.initialProgress ?? 0));
  }

  /**
   * Update progress (0-100)
   */
  setProgress(value: number): void {
    this.progress = Math.max(0, Math.min(100, value));
  }

  /**
   * Increment progress by amount
   */
  incrementProgress(amount: number): void {
    this.setProgress(this.progress + amount);
  }

  draw(context: RenderContext): string[] {
    const width = Math.min(context.width, 80);
    const innerWidth = width - 4;
    const progressWidth = Math.max(10, innerWidth - 20);
    
    // Calculate progress bar
    const filled = Math.round((this.progress / 100) * progressWidth);
    const empty = progressWidth - filled;
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
    const percent = Math.round(this.progress);
    
    const lines: string[] = [];
    
    // Top border
    lines.push('┌' + '─'.repeat(width - 2) + '┐');
    
    // Message line
    const msg = ` ${this.theme.textColor(this.message)}`.padEnd(width - 2);
    lines.push('│' + msg + '│');
    
    // Progress bar line
    const barLine = ` ${progressBar} ${percent}%`.padEnd(width - 2);
    lines.push('│' + barLine + '│');
    
    // Hint line
    const dimHint = this.theme.dimColor('(Press Esc to cancel)');
    const hintLine = ` ${dimHint}`.padEnd(width - 2);
    lines.push('│' + hintLine + '│');
    
    // Bottom border
    lines.push('└' + '─'.repeat(width - 2) + '┘');

    if (this.isFocused) {
      lines[1] = CURSOR_MARKER + lines[1];
    }

    return lines;
  }
}
