import type { Args } from './cli-args.js';

/**
 * Determine the application mode based on parsed arguments and TTY status.
 */
export function resolveAppMode(parsed: Args, stdinIsTTY: boolean): 'print' | 'json' | 'rpc' | 'tui' {
  // If mode explicitly set via --mode, use it
  if (parsed.mode === 'rpc') return 'rpc';
  if (parsed.mode === 'json') return 'json';
  if (parsed.mode === 'tui') return 'tui';
  if (parsed.mode === 'interactive') return 'tui'; // alias for backwards compat
  // Default: if TTY and not --print, use Ink TUI (custom)
  if (parsed.print || !stdinIsTTY) return 'print';
  return 'tui';
}
