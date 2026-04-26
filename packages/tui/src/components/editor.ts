/**
 * Editor Component - Enhanced with Undo/Redo, Kill/Yank, History
 * 
 * Multi-line text editor using KillRing and UndoStack modules.
 */
import type { UIElement, RenderContext, KeyEvent, InteractiveElement } from './base.js';
import { CURSOR_MARKER } from './base.js';
import { visibleWidth, wrapText, truncateText } from './internal-utils.js';
import { KillRing, defaultKillRing } from './kill-ring.js';
import { UndoRedoManager } from './undo-stack.js';
import { getKeybindings } from './keybindings.js';
import { decodeKittyPrintable, matchesKey } from './keys.js';

export interface EditorState {
  lines: string[];
  cursorLine: number;
  cursorCol: number;
}

export interface EditorOptions {
  paddingX?: number;
  paddingY?: number;
  maxHistorySize?: number;
  useGlobalKillRing?: boolean;
}

export class Editor implements UIElement, InteractiveElement {
  private state: EditorState = { lines: [''], cursorLine: 0, cursorCol: 0 };
  private options: Required<EditorOptions>;
  private paddingX: number;
  private paddingY: number;
  
  private undoRedoManager: UndoRedoManager<EditorState>;
  private scrollOffset = 0;
  private killRing: KillRing;
  private lastAction: 'kill' | 'yank' | 'type' | null = null;
  
  private history: string[] = [];
  private historyIndex = -1;
  private historyTemp = '';
  
  private lastRenderWidth = 80;
  
  public isFocused = false;
  public onSubmit?: (text: string) => void;
  public onChange?: (text: string) => void;
  public onEscape?: () => void;
  public borderColor: (s: string) => string = (s) => `\x1b[90m${s}\x1b[0m`;

  constructor(_tui?: any, options: EditorOptions = {}) {
    this.options = {
      paddingX: 0,
      paddingY: 0,
      maxHistorySize: 100,
      useGlobalKillRing: false,
      ...options,
    };
    
    this.paddingX = this.options.paddingX;
    this.paddingY = this.options.paddingY;
    
    // Use global kill ring or local one
    this.killRing = this.options.useGlobalKillRing ? defaultKillRing : new KillRing();
    this.undoRedoManager = new UndoRedoManager<EditorState>(50);
    
    this.pushUndo();
  }

  // ========================================================================
  // Text Operations
  // ========================================================================

  getText(): string {
    return this.state.lines.join('\n');
  }

  setText(text: string): void {
    const lines = text.split('\n');
    this.state = {
      lines: lines.length > 0 ? lines : [''],
      cursorLine: lines.length - 1,
      cursorCol: lines[lines.length - 1]?.length ?? 0,
    };
    this.historyIndex = -1;
    this.pushUndo();
    this.onChange?.(this.getText());
  }

  addToHistory(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || (this.history.length > 0 && this.history[0] === trimmed)) return;
    this.history.unshift(trimmed);
    if (this.history.length > this.options.maxHistorySize) this.history.pop();
  }

  // ========================================================================
  // Undo/Redo
  // ========================================================================

  private pushUndo(): void {
    this.undoRedoManager.save({ ...this.state, lines: [...this.state.lines] });
  }

  private undo(): void {
    const prev = this.undoRedoManager.undo(this.state);
    if (prev) {
      this.state = prev;
      this.onChange?.(this.getText());
    }
  }

  private redo(): void {
    const next = this.undoRedoManager.redo(this.state);
    if (next) {
      this.state = next;
      this.onChange?.(this.getText());
    }
  }

  canUndo(): boolean {
    return this.undoRedoManager.canUndo();
  }

  canRedo(): boolean {
    return this.undoRedoManager.canRedo();
  }

  // ========================================================================
  // Kill/Yank (Cut/Paste)
  // ========================================================================

  private killToEndOfLine(): void {
    const line = this.state.lines[this.state.cursorLine] ?? '';
    if (this.state.cursorCol < line.length) {
      this.pushUndo();
      const killed = line.slice(this.state.cursorCol);
      this.killRing.push(killed, { prepend: false, accumulate: this.lastAction === 'kill' });
      this.lastAction = 'kill';
      this.state.lines[this.state.cursorLine] = line.slice(0, this.state.cursorCol);
      this.onChange?.(this.getText());
    }
  }

  private killToStartOfLine(): void {
    const line = this.state.lines[this.state.cursorLine] ?? '';
    if (this.state.cursorCol > 0) {
      this.pushUndo();
      const killed = line.slice(0, this.state.cursorCol);
      this.killRing.push(killed, { prepend: true, accumulate: this.lastAction === 'kill' });
      this.lastAction = 'kill';
      this.state.lines[this.state.cursorLine] = line.slice(this.state.cursorCol);
      this.state.cursorCol = 0;
      this.onChange?.(this.getText());
    }
  }

  private killWordBackward(): void {
    if (this.state.cursorCol === 0) return;
    this.pushUndo();
    const oldCol = this.state.cursorCol;
    this.moveWordBackwards();
    const start = this.state.cursorCol;
    const line = this.state.lines[this.state.cursorLine] ?? '';
    const killed = line.slice(start, oldCol);
    this.killRing.push(killed, { prepend: true, accumulate: this.lastAction === 'kill' });
    this.lastAction = 'kill';
    this.state.lines[this.state.cursorLine] = line.slice(0, start) + line.slice(oldCol);
    this.onChange?.(this.getText());
  }

  private yank(): void {
    const text = this.killRing.peek();
    if (text) {
      this.pushUndo();
      this.lastAction = 'yank';
      this.insertTextInternal(text);
      this.onChange?.(this.getText());
    }
  }

  private yankPop(): void {
    if (this.lastAction !== 'yank') return;
    this.killRing.rotate();
    // Would need to implement replace-yank, but simplified for now
    const text = this.killRing.peek();
    if (text) {
      this.insertTextInternal(text);
      this.onChange?.(this.getText());
    }
  }

  // ========================================================================
  // Cursor Movement
  // ========================================================================

  private moveToLineStart(): void {
    this.state.cursorCol = 0;
    this.lastAction = null;
  }

  private moveToLineEnd(): void {
    const line = this.state.lines[this.state.cursorLine] ?? '';
    this.state.cursorCol = line.length;
    this.lastAction = null;
  }

  private moveWordBackwards(): void {
    const line = this.state.lines[this.state.cursorLine] ?? '';
    let pos = this.state.cursorCol - 1;
    while (pos > 0 && /\s/.test(line[pos - 1] ?? '')) pos--;
    while (pos > 0 && /\S/.test(line[pos - 1] ?? '')) pos--;
    this.state.cursorCol = Math.max(0, pos);
    this.lastAction = null;
  }

  private moveWordForwards(): void {
    const line = this.state.lines[this.state.cursorLine] ?? '';
    let pos = this.state.cursorCol;
    while (pos < line.length && /\s/.test(line[pos] ?? '')) pos++;
    while (pos < line.length && /\S/.test(line[pos] ?? '')) pos++;
    this.state.cursorCol = Math.min(line.length, pos);
    this.lastAction = null;
  }

  // ========================================================================
  // History Navigation
  // ========================================================================

  private navigateHistory(direction: 1 | -1): void {
    this.lastAction = null;
    if (this.history.length === 0) return;

    const newIndex = this.historyIndex - direction;
    if (newIndex < -1 || newIndex >= this.history.length) return;

    // Save current when first entering history
    if (this.historyIndex === -1 && newIndex >= 0) {
      this.historyTemp = this.getText();
    }

    this.historyIndex = newIndex;
    if (this.historyIndex === -1) {
      this.setTextInternal(this.historyTemp);
    } else {
      this.setTextInternal(this.history[this.historyIndex] ?? '');
    }
  }

  private setTextInternal(text: string): void {
    const lines = text.split('\n');
    this.state.lines = lines.length > 0 ? lines : [''];
    this.state.cursorLine = lines.length - 1;
    this.state.cursorCol = lines[this.state.cursorLine]?.length ?? 0;
    this.onChange?.(this.getText());
  }

  // ========================================================================
  // Text Insertion
  // ========================================================================

  private insertTextInternal(text: string): void {
    if (!text) return;
    const lines = text.split('\n');
    const currentLine = this.state.lines[this.state.cursorLine] ?? '';
    const before = currentLine.slice(0, this.state.cursorCol);
    const after = currentLine.slice(this.state.cursorCol);

    if (lines.length === 1) {
      this.state.lines[this.state.cursorLine] = before + lines[0]! + after;
      this.state.cursorCol += lines[0]!.length;
    } else {
      const newLines = [
        ...this.state.lines.slice(0, this.state.cursorLine),
        before + lines[0]!,
        ...lines.slice(1, -1),
        (lines[lines.length - 1] ?? '') + after,
        ...this.state.lines.slice(this.state.cursorLine + 1),
      ];
      this.state.lines = newLines;
      this.state.cursorLine += lines.length - 1;
      this.state.cursorCol = lines[lines.length - 1]?.length ?? 0;
    }
  }

  // ========================================================================
  // Rendering
  // ========================================================================

  clearCache(): void {
    // No persistent cache
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    this.lastRenderWidth = width;
    const lines: string[] = [];
    
    const contentWidth = Math.max(1, width - this.paddingX * 2);
    
    // Calculate visible range based on cursor position
    const targetLine = this.state.cursorLine;
    const maxVisible = Math.max(5, Math.floor((context.height || 24) * 0.3));
    
    if (targetLine < this.scrollOffset) {
      this.scrollOffset = targetLine;
    } else if (targetLine >= this.scrollOffset + maxVisible) {
      this.scrollOffset = targetLine - maxVisible + 1;
    }
    
    const visibleStart = this.scrollOffset;
    const visibleEnd = Math.min(this.state.lines.length, visibleStart + maxVisible);
    
    // Top border
    if (this.scrollOffset > 0) {
      const indicator = `↑ ${this.scrollOffset} more`;
      lines.push(this.borderColor('─'.repeat(width - indicator.length - 1) + indicator));
    } else {
      lines.push(this.borderColor('─'.repeat(width)));
    }
    
    // Content lines
    for (let i = visibleStart; i < visibleEnd; i++) {
      const line = this.state.lines[i] ?? '';
      const wrapped = wrapText(line, contentWidth);
      
      for (let j = 0; j < wrapped.length; j++) {
        const content = wrapped[j] ?? '';
        const prevLen = wrapped.slice(0, j).reduce((s, w) => s + visibleWidth(w), 0);
        const cursorInWrap = i === this.state.cursorLine && 
                           this.state.cursorCol >= prevLen &&
                           this.state.cursorCol <= prevLen + content.length;
        
        let display = ' '.repeat(this.paddingX) + content.padEnd(contentWidth);
        
        if (this.isFocused && cursorInWrap) {
          const relCol = this.state.cursorCol - prevLen;
          const before = display.slice(0, this.paddingX + relCol);
          const after = display.slice(this.paddingX + relCol);
          const char = after[0] ?? ' ';
          display = before + CURSOR_MARKER + `\x1b[7m${char}\x1b[0m` + after.slice(1);
        }
        
        lines.push(display.substring(0, width).padEnd(width));
      }
    }
    
    // Bottom border
    const remaining = this.state.lines.length - visibleEnd;
    if (remaining > 0) {
      const indicator = `↓ ${remaining} more`;
      lines.push(this.borderColor('─'.repeat(width - indicator.length - 1) + indicator));
    } else {
      lines.push(this.borderColor('─'.repeat(width)));
    }
    
    return lines;
  }

  // ========================================================================
  // Key Handling
  // ========================================================================

  handleKey(event: KeyEvent): void {
    const key = event.name;
    const raw = event.raw;
    const kb = getKeybindings();
    
    // Decode printable characters
    const printable = decodeKittyPrintable(raw) ?? (raw.length === 1 && raw.charCodeAt(0) >= 32 ? raw : undefined);
    
    // Undo/Redo
    if (key === 'z' && event.modifiers?.ctrl && !event.modifiers?.shift) {
      this.undo();
      return;
    }
    if ((key === 'z' && event.modifiers?.ctrl && event.modifiers?.shift) || key === 'y') {
      this.redo();
      return;
    }
    
    // Kill/Yank
    if (key === 'k' && event.modifiers?.ctrl) {
      this.killToEndOfLine();
      return;
    }
    if (key === 'u' && event.modifiers?.ctrl) {
      this.killToStartOfLine();
      return;
    }
    if (key === 'w' && event.modifiers?.ctrl) {
      this.killWordBackward();
      return;
    }
    if (key === 'y' && event.modifiers?.ctrl) {
      this.yank();
      return;
    }
    if (key === 'y' && event.modifiers?.alt) {
      this.yankPop();
      return;
    }
    
    // Escape
    if (key === 'Escape') {
      this.onEscape?.();
      return;
    }
    
    // Navigation
    if (key === 'Home' || (key === 'a' && event.modifiers?.ctrl)) {
      this.moveToLineStart();
      return;
    }
    if (key === 'End' || (key === 'e' && event.modifiers?.ctrl)) {
      this.moveToLineEnd();
      return;
    }
    if (key === 'ArrowLeft' || (key === 'b' && event.modifiers?.ctrl)) {
      if (this.state.cursorCol > 0) this.state.cursorCol--;
      else if (this.state.cursorLine > 0) {
        this.state.cursorLine--;
        this.state.cursorCol = this.state.lines[this.state.cursorLine]?.length ?? 0;
      }
      this.lastAction = null;
      return;
    }
    if (key === 'ArrowRight' || (key === 'f' && event.modifiers?.ctrl)) {
      const line = this.state.lines[this.state.cursorLine] ?? '';
      if (this.state.cursorCol < line.length) this.state.cursorCol++;
      else if (this.state.cursorLine < this.state.lines.length - 1) {
        this.state.cursorLine++;
        this.state.cursorCol = 0;
      }
      this.lastAction = null;
      return;
    }
    if (key === 'ArrowUp') {
      const isEmpty = this.state.lines.length === 1 && this.state.lines[0] === '';
      if (isEmpty || this.historyIndex >= 0) {
        this.navigateHistory(-1);
      } else if (this.state.cursorLine > 0) {
        this.state.cursorLine--;
        const prevLine = this.state.lines[this.state.cursorLine] ?? '';
        this.state.cursorCol = Math.min(this.state.cursorCol, prevLine.length);
      }
      return;
    }
    if (key === 'ArrowDown') {
      if (this.historyIndex >= 0) {
        this.navigateHistory(1);
      } else if (this.state.cursorLine < this.state.lines.length - 1) {
        this.state.cursorLine++;
        const nextLine = this.state.lines[this.state.cursorLine] ?? '';
        this.state.cursorCol = Math.min(this.state.cursorCol, nextLine.length);
      }
      return;
    }
    
    // Word navigation
    if (key === 'b' && event.modifiers?.alt) {
      this.moveWordBackwards();
      return;
    }
    if (key === 'f' && event.modifiers?.alt) {
      this.moveWordForwards();
      return;
    }
    
    // Backspace
    if (key === 'Backspace') {
      this.historyIndex = -1;
      this.lastAction = null;
      if (this.state.cursorCol > 0) {
        this.pushUndo();
        const line = this.state.lines[this.state.cursorLine] ?? '';
        this.state.lines[this.state.cursorLine] = line.slice(0, -1 + this.state.cursorCol) + line.slice(this.state.cursorCol);
        this.state.cursorCol--;
        this.onChange?.(this.getText());
      } else if (this.state.cursorLine > 0) {
        this.pushUndo();
        const currentLine = this.state.lines[this.state.cursorLine] ?? '';
        const prevLine = this.state.lines[this.state.cursorLine - 1] ?? '';
        this.state.cursorCol = prevLine.length;
        this.state.lines[this.state.cursorLine - 1] = prevLine + currentLine;
        this.state.lines.splice(this.state.cursorLine, 1);
        this.state.cursorLine--;
        this.onChange?.(this.getText());
      }
      return;
    }
    
    // Delete
    if (key === 'Delete') {
      this.historyIndex = -1;
      this.lastAction = null;
      const line = this.state.lines[this.state.cursorLine] ?? '';
      if (this.state.cursorCol < line.length) {
        this.pushUndo();
        this.state.lines[this.state.cursorLine] = line.slice(0, this.state.cursorCol) + line.slice(this.state.cursorCol + 1);
        this.onChange?.(this.getText());
      } else if (this.state.cursorLine < this.state.lines.length - 1) {
        this.pushUndo();
        const nextLine = this.state.lines[this.state.cursorLine + 1] ?? '';
        this.state.lines[this.state.cursorLine] = line + nextLine;
        this.state.lines.splice(this.state.cursorLine + 1, 1);
        this.onChange?.(this.getText());
      }
      return;
    }
    
    // Enter / New Line
    if (key === 'Enter') {
      this.pushUndo();
      this.historyIndex = -1;
      this.lastAction = null;
      const line = this.state.lines[this.state.cursorLine] ?? '';
      const before = line.slice(0, this.state.cursorCol);
      const after = line.slice(this.state.cursorCol);
      this.state.lines[this.state.cursorLine] = before;
      this.state.lines.splice(this.state.cursorLine + 1, 0, after);
      this.state.cursorLine++;
      this.state.cursorCol = 0;
      this.onChange?.(this.getText());
      
      if (event.modifiers?.shift || event.modifiers?.ctrl) {
        this.onSubmit?.(this.getText());
      }
      return;
    }
    
    // Regular character input
    if (printable) {
      this.pushUndo();
      this.lastAction = 'type';
      this.historyIndex = -1;
      this.insertTextInternal(printable);
      this.onChange?.(this.getText());
    }
  }
}
