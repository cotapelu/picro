// MenuSystem – Interactive menu with keyboard navigation
import type { InputHandler } from './input-handler.js';

export interface MenuItem<T = any> {
  id: string;
  label: string;
  value?: T;
}

export class MenuSystem<T = any> {
  private input: InputHandler;
  private title: string;
  private items: MenuItem<T>[] = [];
  private selectedIndex = 0;
  private onSelect?: (item: MenuItem<T>) => void;
  private onCancel?: () => void;
  private unsub?: () => void;

  constructor(input: InputHandler, title?: string) {
    this.input = input;
    this.title = title || 'Menu';
  }

  show(items: MenuItem<T>[], onSelect: (item: MenuItem<T>) => void, onCancel?: () => void): void {
    this.items = items;
    this.selectedIndex = 0;
    this.onSelect = onSelect;
    this.onCancel = onCancel;

    this.unsub = this.input.onKeypress((key, char) => this.handleKey(key, char));
    this.render();
  }

  close(): void {
    if (this.unsub) this.unsub();
    this.clear();
  }

  private handleKey(key: { name: string; sequence?: string }, char: string | undefined): void {
    if (key.name === 'escape') {
      this.close();
      this.onCancel?.();
      return;
    }

    if (key.name === 'return') {
      const selected = this.items[this.selectedIndex];
      this.close();
      if (selected) this.onSelect?.(selected);
      return;
    }

    if (key.name === 'up' || key.sequence === '\x1b[A') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.render();
      return;
    }

    if (key.name === 'down' || key.sequence === '\x1b[B') {
      this.selectedIndex = Math.min(this.items.length - 1, this.selectedIndex + 1);
      this.render();
      return;
    }
  }

  private render(): void {
    const lines: string[] = [];
    lines.push(`\n=== ${this.title} ===`);
    this.items.forEach((item, idx) => {
      const prefix = idx === this.selectedIndex ? '> ' : '  ';
      lines.push(`${prefix}${item.label}`);
    });
    lines.push('\n↑/↓: navigate  Enter: select  Esc: cancel');

    // Move cursor up and clear previous menu
    if (this.items.length > 0) {
      process.stdout.write(`\x1b[${this.items.length + 3}A`);
    }
    process.stdout.write(lines.join('\n') + '\x1b[[?25l'); // hide cursor
  }

  private clear(): void {
    if (this.items.length > 0) {
      process.stdout.write(`\x1b[${this.items.length + 3}A\x1b[2K`);
    }
    process.stdout.write('\x1b[?25h'); // show cursor
  }
}
