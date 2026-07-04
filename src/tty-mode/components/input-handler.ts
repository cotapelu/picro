// InputHandler – Raw keyboard input management
export type KeyHandler = (key: { name: string; sequence?: string }, char: string | undefined) => void;

export class InputHandler {
  private line = '';
  private onEnter?: (line: string) => void;
  private onSlash?: () => void;
  private keyHandlers: KeyHandler[] = [];

  constructor() {}

  setCallbacks(onEnter: (line: string) => void, onSlash: () => void): void {
    this.onEnter = onEnter;
    this.onSlash = onSlash;
  }

  onKeypress(handler: KeyHandler): () => void {
    this.keyHandlers.push(handler);
    return () => {
      const idx = this.keyHandlers.indexOf(handler);
      if (idx !== -1) this.keyHandlers.splice(idx, 1);
    };
  }

  handleKey(key: { name: string; sequence?: string }, char: string | undefined): void {
    // Notify all key handlers (for menu, etc.)
    for (const h of this.keyHandlers) h(key, char);

    // Global shortcuts
    if (char === '\x03') { // Ctrl+C
      process.exit(0);
      return;
    }

    if (key.name === 'return') {
      const trimmed = this.line.trim();
      this.line = '';
      if (this.onEnter && trimmed) {
        this.onEnter(trimmed);
      }
      return;
    }

    if (key.name === 'backspace') {
      if (this.line.length > 0) {
        this.line = this.line.slice(0, -1);
        process.stdout.write('\b \b');
      }
      return;
    }

    // Slash shortcut at start of line
    if (char === '/' && this.line === '') {
      if (this.onSlash) this.onSlash();
      return;
    }

    // Printable characters
    if (char && char >= ' ' && char <= '~') {
      this.line += char;
      process.stdout.write(char);
    }
  }

  clear(): void {
    this.line = '';
  }
}
