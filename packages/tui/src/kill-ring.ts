/**
 * Kill Ring - Emacs-style copy/paste buffer
 * Tracks killed text entries for yank (paste) operations
 */

export interface PushOptions {
  /** If accumulating, prepend (backward deletion) or append (forward deletion) */
  prepend: boolean;
  /** Merge with the most recent entry instead of creating a new one */
  accumulate?: boolean;
}

/**
 * Ring buffer for Emacs-style kill/yank operations
 * 
 * Tracks killed (deleted) text entries. Consecutive kills can accumulate
 * into a single entry. Supports yank (paste most recent) and yank-pop
 * (cycle through older entries).
 * 
 * @example
 * const killRing = new KillRing();
 * 
 * // Kill text (add to ring)
 * killRing.push(selectedText, { prepend: false });
 * 
 * // Yank (paste) - get most recent
 * const text = killRing.peek() ?? '';
 * 
 * // Yank-pop - cycle through older entries
 * killRing.rotate();
 * const olderText = killRing.peek() ?? '';
 */
export class KillRing {
  private entries: string[] = [];

  /**
   * Add text to the kill ring
   * 
   * @param text - The killed text to add
   * @param opts - Push options
   */
  push(text: string, opts: PushOptions): void {
    if (!text) return;

    if (opts.accumulate && this.entries.length > 0) {
      // Merge with most recent entry
      const last = this.entries.pop()!;
      if (opts.prepend) {
        this.entries.push(text + last);
      } else {
        this.entries.push(last + text);
      }
    } else {
      this.entries.push(text);
    }
  }

  /**
   * Get most recent entry without modifying the ring
   */
  peek(): string | undefined {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1] : undefined;
  }

  /**
   * Get nth entry from the end (0 = most recent)
   */
  peekAt(index: number): string | undefined {
    if (index < 0 || index >= this.entries.length) return undefined;
    return this.entries[this.entries.length - 1 - index];
  }

  /**
   * Move last entry to front (for yank-pop cycling)
   */
  rotate(): void {
    if (this.entries.length > 1) {
      const last = this.entries.pop()!;
      this.entries.unshift(last);
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get number of entries in the ring
   */
  get length(): number {
    return this.entries.length;
  }

  /**
   * Check if ring is empty
   */
  isEmpty(): boolean {
    return this.entries.length === 0;
  }

  /**
   * Get all entries (for debugging, most recent first)
   */
  getEntries(): readonly string[] {
    return [...this.entries].reverse();
  }
}

/**
 * Default kill ring instance (global cut buffer)
 */
export const defaultKillRing = new KillRing();
