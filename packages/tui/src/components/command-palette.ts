import type { RenderContext, KeyEvent } from './base.js';
import { SelectList, type SelectItem } from './select-list.js';

/**
 * Command definition
 */
export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  description?: string;
  category?: string;
  onExecute: () => void;
}

/**
 * CommandPalette - searchable command list (CMD+Shift+P)
 * Basic version: parent manages visibility and filter.
 */
export class CommandPalette {
  private commands: Command[];
  private selectList: SelectList;
  private onSelect?: (command: Command) => void;
  private onCancel?: () => void;

  constructor(opts: { commands: Command[]; visibleRows?: number; theme?: any; onSelect?: (command: Command) => void; onCancel?: () => void }) {
    this.commands = opts.commands;
    this.onSelect = opts.onSelect;
    this.onCancel = opts.onCancel;
    const items = this.formatItems(opts.commands);
    // Use dummy callbacks; we handle Enter/Escape in handleKey directly
    this.selectList = new SelectList(
      items,
      opts.visibleRows ?? 10,
      opts.theme ?? {},
      () => {},
      () => {}
    );
  }

  private formatItems(commands: Command[]): SelectItem[] {
    return commands.map(c => {
      let label = c.label;
      if (c.category) label = `[${c.category}] ${label}`;
      if (c.shortcut) label += ` (${c.shortcut})`;
      return { value: c.id, label, description: c.description };
    });
  }

  /**
   * Update commands list
   */
  setCommands(commands: Command[]): void {
    this.commands = commands;
    this.selectList.setItems(this.formatItems(commands));
  }

  /**
   * Filter commands by query (matches label, description)
   */
  setFilter(query: string): void {
    const q = query.toLowerCase();
    const filtered = this.commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
    this.selectList.setItems(this.formatItems(filtered));
  }

  /**
   * Access underlying SelectList for focus/keyboard handling
   */
  getSelectList(): SelectList {
    return this.selectList;
  }

  // Delegate drawing to SelectList with border
  draw(context: RenderContext): string[] {
    const innerLines = this.selectList.draw(context);
    const width = context.width;
    const lines: string[] = [];
    const borderTop = '┌' + '─'.repeat(Math.max(0, width - 2)) + '┐';
    const borderBottom = '└' + '─'.repeat(Math.max(0, width - 2)) + '┘';
    lines.push(borderTop);
    for (let i = 0; i < innerLines.length; i++) {
      const line = innerLines[i] ?? '';
      const padded = line.padEnd(width);
      lines.push('│' + padded.slice(0, width - 2) + '│');
    }
    lines.push(borderBottom);
    return lines;
  }

  clearCache(): void {}

  // Direct key handling for reliable behavior
  handleKey(key: KeyEvent): void {
    const name = key.name;
    if (name === 'Escape') {
      this.onCancel?.();
    } else if (name === 'Enter' || name === 'Return') {
      const sl = this.selectList as any;
      const idx = sl.selectedIndex;
      if (idx >= 0 && idx < this.commands.length) {
        const cmd = this.commands[idx];
        this.onSelect?.(cmd);
        cmd.onExecute();
      }
    } else {
      this.selectList.handleKey?.(key);
    }
  }
}
