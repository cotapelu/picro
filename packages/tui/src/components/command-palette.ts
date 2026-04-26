import type { RenderContext } from './base.js';
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
    this.selectList = new SelectList(
      items,
      opts.visibleRows ?? 10,
      opts.theme ?? {},
      (value) => {
        const cmd = opts.commands.find(c => c.id === value);
        if (cmd) {
          this.onSelect?.(cmd);
          cmd.onExecute();
        }
      },
      () => { this.onCancel?.(); }
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

  // Delegate key handling to SelectList
  handleKey(key: any): void {
    this.selectList.handleKey?.(key);
  }
}
