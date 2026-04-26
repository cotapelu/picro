import { BorderedLoader } from './loader.js';

/**
 * CancellableLoader - BorderedLoader with explicit AbortSignal
 * Convenience wrapper that exposes the signal for cancellation.
 */
export class CancellableLoader extends BorderedLoader {
  constructor(
    tui: any,
    theme: any,
    message: string,
    onAbort?: () => void
  ) {
    super(tui, theme, message, onAbort);
  }

  /**
   * Abort the loader
   */
  abort(): void {
    // Trigger abort logic same as Escape
    super.handleKey({ name: 'Escape', raw: '\x1b' } as any);
  }

  // dispose override to ensure cleanup
  dispose(): void {
    clearInterval((this as any).spinnerInterval);
  }
}
