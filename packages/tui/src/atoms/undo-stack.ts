/**
 * Undo Stack - Generic undo/redo with state snapshots
 * Uses structuredClone for deep cloning state
 */

/**
 * Generic undo stack with clone-on-push semantics.
 * 
 * Stores deep clones of state snapshots. Popped snapshots are returned
 * directly (no re-cloning) since they are already detached.
 * 
 * @template S The state type (must be structuredClone-compatible)
 * 
 * @example
 * interface EditorState {
 *   text: string;
 *   cursor: number;
 * }
 * 
 * const undoStack = new UndoStack<EditorState>();
 * 
 * // Save state before change
 * undoStack.push({ text: currentText, cursor: cursorPos });
 * 
 * // Make changes...
 * 
 * // Undo - restore previous state
 * const prevState = undoStack.pop();
 * if (prevState) {
 *   currentText = prevState.text;
 *   cursorPos = prevState.cursor;
 * }
 */
export class UndoStack<S> {
  private stack: S[] = [];
  private limit: number;

  /**
   * Create an undo stack
   * @param limit Maximum number of snapshots to keep (0 = unlimited)
   */
  constructor(limit: number = 0) {
    this.limit = limit;
  }

  /**
   * Push a state snapshot onto the stack (clones the state)
   */
  push(state: S): void {
    this.stack.push(structuredClone(state));
    
    // Enforce limit by removing oldest
    if (this.limit > 0 && this.stack.length > this.limit) {
      this.stack.shift();
    }
  }

  /**
   * Pop and return the most recent snapshot, or undefined if empty
   */
  pop(): S | undefined {
    return this.stack.pop();
  }

  /**
   * Peek at the most recent snapshot without removing it
   */
  peek(): S | undefined {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
  }

  /**
   * Remove all snapshots
   */
  clear(): void {
    this.stack.length = 0;
  }

  /**
   * Get number of snapshots
   */
  get length(): number {
    return this.stack.length;
  }

  /**
   * Check if stack is empty
   */
  isEmpty(): boolean {
    return this.stack.length === 0;
  }

  /**
   * Check if can undo (has snapshots)
   */
  canUndo(): boolean {
    return this.stack.length > 0;
  }

  /**
   * Set or change the limit
   */
  setLimit(limit: number): void {
    this.limit = limit;
    if (limit > 0 && this.stack.length > limit) {
      this.stack.splice(0, this.stack.length - limit);
    }
  }

  /**
   * Get current limit
   */
  getLimit(): number {
    return this.limit;
  }
}

/**
 * Undo/Redo manager with separate undo and redo stacks
 * 
 * @example
 * const manager = new UndoRedoManager<EditorState>();
 * 
 * // Save before edit
 * manager.save({ text: 'Hello', cursor: 5 });
 * 
 * // Make edit...
 * 
 * // Undo
 * const undoState = manager.undo();
 * if (undoState) { restore(undoState); }
 * 
 * // Redo
 * const redoState = manager.redo();
 * if (redoState) { restore(redoState); }
 */
export class UndoRedoManager<S> {
  private undoStack: UndoStack<S>;
  private redoStack: UndoStack<S>;

  constructor(limit: number = 0) {
    this.undoStack = new UndoStack<S>(limit);
    this.redoStack = new UndoStack<S>(limit);
  }

  /**
   * Save a state snapshot (clears redo stack)
   */
  save(state: S): void {
    this.undoStack.push(state);
    this.redoStack.clear();
  }

  /**
   * Undo to previous state
   * @returns The previous state or undefined if no undo available
   */
  undo(currentState?: S): S | undefined {
    const prev = this.undoStack.pop();
    if (prev) {
      if (currentState !== undefined) {
        this.redoStack.push(currentState);
      }
      return prev;
    }
    return undefined;
  }

  /**
   * Redo next state
   * @returns The next state or undefined if no redo available
   */
  redo(currentState?: S): S | undefined {
    const next = this.redoStack.pop();
    if (next) {
      if (currentState !== undefined) {
        this.undoStack.push(currentState);
      }
      return next;
    }
    return undefined;
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.undoStack.canUndo();
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return !this.redoStack.isEmpty();
  }

  /**
   * Clear both stacks
   */
  clear(): void {
    this.undoStack.clear();
    this.redoStack.clear();
  }

  /**
   * Get undo stack length
   */
  get undoLength(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack length
   */
  get redoLength(): number {
    return this.redoStack.length;
  }
}
