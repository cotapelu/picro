// InputHandler – Raw keyboard input with advanced editing and persistent history
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, existsSync, appendFileSync, writeFileSync } from 'node:fs';

export type KeyHandler = (key: { name: string; sequence?: string }, char: string | undefined) => void;

export class InputHandler {
  private line = '';
  private onEnter?: (line: string) => void;
  private onSlash?: () => void;
  private keyHandlers: KeyHandler[] = [];

  // History
  private history: string[] = [];
  private historyIndex = -1;
  private historyMax: number;
  private persistHistory: boolean;
  private historyFile: string;

  // Multi-line mode
  private multiLine = false;
  private lines: string[] = [''];
  private currentLineIndex = 0;

  // Search mode (Ctrl+R)
  private searchMode = false;
  private searchQuery = '';
  private searchResults: number[] = [];

  constructor(historySize = 1000, persistHistory = true, historyFile = '.picro_history') {
    this.historyMax = historySize;
    this.persistHistory = persistHistory;
    this.historyFile = historyFile;
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      const home = homedir();
      const path = join(home, this.historyFile);
      if (existsSync(path)) {
        const content = readFileSync(path, 'utf-8');
        this.history = content.split('\n').filter(l => l.trim().length > 0);
        // limit
        if (this.history.length > this.historyMax) {
          this.history = this.history.slice(-this.historyMax);
        }
      }
    } catch {
      // ignore
    }
  }

  private appendToHistory(line: string): void {
    if (!this.persistHistory) return;
    try {
      const home = homedir();
      const path = join(home, this.historyFile);
      appendFileSync(path, line + '\n');
    } catch {
      // ignore
    }
  }

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
    for (const h of this.keyHandlers) h(key, char);

    if (char === '\x03') { // Ctrl+C
      this.saveState();
      process.exit(0);
      return;
    }

    // Search mode (Ctrl+R)
    if (this.searchMode) {
      this.handleSearchKey(key, char);
      return;
    }

    // Multi-line shortcuts
    if (this.multiLine) {
      this.handleMultiLineKey(key, char);
      return;
    }

    // Single-line mode
    if (key.name === 'return') {
      const trimmed = this.line.trim();
      if (trimmed) {
        this.history.push(trimmed);
        this.appendToHistory(trimmed);
        if (this.history.length > this.historyMax) this.history.shift();
        this.historyIndex = this.history.length;
        this.line = '';
        if (this.onEnter) this.onEnter(trimmed);
      } else {
        this.line = '';
        process.stdout.write('\n');
      }
      return;
    }

    if (key.sequence === '\x1b[5~') { // Ctrl+Up (search history backward)
      if (this.history.length > 0) {
        if (this.historyIndex <= 0) this.historyIndex = 0;
        else this.historyIndex--;
        this.line = this.history[this.historyIndex] || '';
        this.redrawLine();
      }
      return;
    }

    if (key.sequence === '\x1b[6~') { // Ctrl+Down (search history forward)
      if (this.history.length > 0) {
        if (this.historyIndex >= this.history.length - 1) {
          this.historyIndex = this.history.length;
          this.line = '';
        } else {
          this.historyIndex++;
          this.line = this.history[this.historyIndex] || '';
        }
        this.redrawLine();
      }
      return;
    }

    if (key.name === 'up') {
      if (this.history.length === 0) return;
      if (this.historyIndex <= 0) return;
      this.historyIndex--;
      const histLine = this.history[this.historyIndex];
      this.line = histLine;
      this.redrawLine();
      return;
    }

    if (key.name === 'down') {
      if (this.history.length === 0) return;
      if (this.historyIndex >= this.history.length - 1) {
        this.historyIndex = this.history.length;
        this.line = '';
        this.redrawLine();
        return;
      }
      this.historyIndex++;
      const histLine = this.history[this.historyIndex];
      this.line = histLine;
      this.redrawLine();
      return;
    }

    // Editing shortcuts
    if (key.sequence === '\x01') { // Ctrl+A (home)
      this.cursorHome();
      return;
    }
    if (key.sequence === '\x05') { // Ctrl+E (end)
      this.cursorEnd();
      return;
    }
    if (key.sequence === '\x15') { // Ctrl+U (kill to start)
      this.line = '';
      this.redrawLine();
      return;
    }
    if (key.sequence === '\x0b') { // Ctrl+K (kill to end)
      this.line = '';
      this.redrawLine();
      return;
    }
    if (key.sequence === '\x17') { // Ctrl+W (kill prev word)
      this.deletePrevWord();
      return;
    }

    if (key.name === 'backspace') {
      if (this.line.length > 0) {
        this.line = this.line.slice(0, -1);
        process.stdout.write('\b \b');
      }
      return;
    }

    if (key.name === 'escape') {
      this.line = '';
      this.redrawLine();
      return;
    }

    // Slash at start triggers menu
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

  private handleMultiLineKey(key: { name: string; sequence?: string }, char: string | undefined): void {
    if (key.name === 'return' && !this.isModifier(key)) {
      // In multi-line, Enter sends the entire buffer
      const full = this.lines.join('\n').trim();
      if (full) {
        this.history.push(full);
        this.appendToHistory(full);
        if (this.history.length > this.historyMax) this.history.shift();
        this.historyIndex = this.history.length;
        this.lines = [''];
        this.currentLineIndex = 0;
        if (this.onEnter) this.onEnter(full);
      } else {
        this.lines = [''];
        this.currentLineIndex = 0;
        process.stdout.write('\n');
      }
      return;
    }

    if (key.name === 'backspace') {
      if (this.lines[this.currentLineIndex].length > 0) {
        this.lines[this.currentLineIndex] = this.lines[this.currentLineIndex].slice(0, -1);
        this.redrawMultiLine();
      } else if (this.currentLineIndex > 0) {
        // Merge lines
        const prev = this.lines[this.currentLineIndex - 1];
        const curr = this.lines[this.currentLineIndex];
        this.lines.splice(this.currentLineIndex - 1, 1);
        this.currentLineIndex--;
        this.lines[this.currentLineIndex] = prev + curr;
        this.redrawMultiLine();
      }
      return;
    }

    if (key.name === 'up') {
      if (this.currentLineIndex > 0) {
        this.currentLineIndex--;
        this.redrawMultiLine();
      }
      return;
    }

    if (key.name === 'down') {
      if (this.currentLineIndex < this.lines.length - 1) {
        this.currentLineIndex++;
        this.redrawMultiLine();
      }
      return;
    }

    if (char && char >= ' ' && char <= '~') {
      this.lines[this.currentLineIndex] += char;
      process.stdout.write(char);
    }
  }

  private isModifier(key: { name: string; sequence?: string }): boolean {
    return key.name === 'shift' || key.name === 'ctrl' || key.name === 'alt' || key.name === 'meta';
  }

  private deletePrevWord(): void {
    const line = this.line;
    const space = line.lastIndexOf(' ');
    if (space === -1) {
      this.line = '';
    } else {
      this.line = line.slice(0, space);
    }
    this.redrawLine();
  }

  private cursorHome(): void {
    // Already at start, no need to move cursor physically
    this.line = this.line.trimStart();
    this.redrawLine();
  }

  private cursorEnd(): void {
    // No-op for single-line: cursor always at end
  }

  private handleSearchKey(key: { name: string; sequence?: string }, char: string | undefined): void {
    // Simplified: only support Esc to exit search
    if (key.name === 'escape') {
      this.searchMode = false;
      this.searchQuery = '';
      this.line = this.history[this.historyIndex] || '';
      this.redrawLine();
    } else if (char && char >= ' ') {
      this.searchQuery += char;
      // Find next match backward (simple)
      const idx = this.history.slice(0, this.historyIndex).reverse().findIndex(l => l.includes(this.searchQuery));
      if (idx !== -1) {
        this.historyIndex = Math.max(0, this.history.length - 1 - idx);
        this.line = this.history[this.historyIndex];
      }
      this.redrawLine(); // could show search prompt
    }
  }

  private redrawLine(): void {
    process.stdout.write('\r\x1b[2K> ' + this.line);
  }

  private redrawMultiLine(): void {
    // Clear and redraw all lines with current line index indicated
    const clearLines = this.lines.length + 1;
    process.stdout.write(`\r\x1b[${clearLines}A\x1b[2K`);
    this.lines.forEach((ln, idx) => {
      const prefix = idx === this.currentLineIndex ? '> ' : '  ';
      process.stdout.write(prefix + ln + '\n');
    });
  }

  clear(): void {
    this.line = '';
    this.lines = [''];
    this.currentLineIndex = 0;
  }

  getLine(): string {
    if (this.multiLine) {
      return this.lines.join('\n');
    }
    return this.line;
  }

  setMultiLine(enabled: boolean): void {
    this.multiLine = enabled;
    if (enabled) {
      this.lines = [this.line];
      this.currentLineIndex = 0;
    }
  }

  isMultiLine(): boolean {
    return this.multiLine;
  }

  private saveState(): void {
    // Could flush history if persist delayed
  }
}
