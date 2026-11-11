// Screen - Main TUI screen manager
// Handles terminal setup, render loop, input, cleanup

import type { Component } from './Component.js';

export interface ScreenOptions {
  /**
   * Enable input processing (default: true)
   */
  input?: boolean;
  /**
   * Screen title (for terminal title bar if supported)
   */
  title?: string;
  /**
   * Exit on Ctrl+C (default: true)
   */
  exitOnCtrlC?: boolean;
}

export class Screen {
  private components: Component[] = [];
  private running = false;
  private options: Required<ScreenOptions>;
  public stdin: NodeJS.ReadStream;
  public stdout: NodeJS.WriteStream;
  private rawMode = false;
  private inputBuffer: string = '';
  private onInputCallback?: (key: string) => void;
  private onResizeCallback?: () => void;

  constructor(options: ScreenOptions = {}) {
    this.options = {
      input: true,
      title: '',
      exitOnCtrlC: true,
      ...options,
    };
    this.stdin = process.stdin;
    this.stdout = process.stdout;
  }

  /**
   * Add component to screen
   */
  add(component: Component): void {
    this.components.push(component);
  }

  /**
   * Remove component from screen
   */
  remove(component: Component): void {
    const idx = this.components.indexOf(component);
    if (idx !== -1) {
      this.components.splice(idx, 1);
    }
  }

  /**
   * Start render loop
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.setupTerminal();

    try {
      // Initial render
      this.render();

      // Input loop if enabled
      if (this.options.input) {
        await this.inputLoop();
      } else {
        // Wait for stop signal
        await new Promise(() => {}); // Keep alive
      }
    } finally {
      this.cleanup();
    }
  }

  /**
   * Stop the screen
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Force re-render
   */
  render(): void {
    // Clear screen
    this.clear();

    // Render all components
    for (const component of this.components) {
      this.stdout.write(component.render());
    }
  }

  /**
   * Set input handler
   */
  onInput(callback: (key: string) => void): void {
    this.onInputCallback = callback;
  }

  /**
   * Set resize handler
   */
  onResize(callback: () => void): void {
    this.onResizeCallback = callback;
  }

  /**
   * Get terminal size
   */
  getSize(): { width: number; height: number } {
    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24,
    };
  }

  /**
   * Clear screen
   */
  public clear(): void {
    this.stdout.write('\x1b[2J\x1b[H');
  }

  /**
   * Setup terminal for raw input
   */
  private setupTerminal(): void {
    if (!this.stdin.isTTY) return;

    this.stdin.setRawMode?.(true);
    this.stdin.resume();
    this.stdin.setEncoding('utf8');

    // Set title if provided
    if (this.options.title) {
      this.stdout.write(`\x1b]0;${this.options.title}\x1b\\`);
    }

    // Handle input
    this.stdin.on('data', (chunk: string) => {
      if (!this.running) return;

      // Check for resize
      if (chunk === '\x1b[8;') {
        this.onResizeCallback?.();
        return;
      }

      // Handle Ctrl+C
      if (this.options.exitOnCtrlC && chunk === '\u0003') {
        this.stop();
        process.exit(0);
        return;
      }

      // Accumulate input buffer
      this.inputBuffer += chunk;

      // Process escape sequences
      if (this.inputBuffer.includes('\x1b[')) {
        const parts = this.inputBuffer.split(/(\x1b\[[0-9;]*[a-zA-Z])/);
        for (const part of parts) {
          if (part.startsWith('\x1b[')) {
            this.onInputCallback?.(part);
          } else if (part.length > 0) {
            // Regular characters
            for (const char of part) {
              this.onInputCallback?.(char);
            }
          }
        }
        this.inputBuffer = '';
      } else {
        // Process each character
        for (const char of chunk) {
          this.onInputCallback?.(char);
        }
      }
    });
  }

  /**
   * Input loop
   */
  private async inputLoop(): Promise<void> {
    // Keep running until stopped
    while (this.running) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Cleanup terminal
   */
  private cleanup(): void {
    if (this.stdin.isTTY) {
      this.stdin.setRawMode?.(false);
      this.stdin.pause();
    }
    this.stdout.write('\x1b[0m'); // Reset colors
    this.stdout.write('\n');
  }
}
