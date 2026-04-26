/**
 * CommandPalette Component
 * Quick command launcher (CMD+Shift+P style)
 */
import { CURSOR_MARKER, type UIElement, type RenderContext, type KeyEvent, type InteractiveElement } from './base.js';
import { visibleWidth, truncateText } from './internal-utils.js';
import { fuzzyFilter } from './fuzzy.js';
import { Input } from './input.js';

export interface Command {
  /** Unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Category/section */
  category?: string;
  /** Keyboard shortcut (shown as hint) */
  shortcut?: string;
  /** Action when selected */
  onExecute: () => void;
}

export interface CommandPaletteTheme {
  bgColor: (s: string) => string;
  fgColor: (s: string) => string;
  borderColor: (s: string) => string;
  selectedBg: (s: string) => string;
  selectedFg: (s: string) => string;
  dimColor: (s: string) => string;
  categoryColor: (s: string) => string;
  shortcutColor: (s: string) => string;
}

export const defaultTheme: CommandPaletteTheme = {
  bgColor: (s) => `\x1b[48;5;234m${s}\x1b[0m`,
  fgColor: (s) => `\x1b[37m${s}\x1b[0m`,
  borderColor: (s) => `\x1b[90m${s}\x1b[0m`,
  selectedBg: (s) => `\x1b[48;5;25m${s}\x1b[0m`,
  selectedFg: (s) => `\x1b[97m${s}\x1b[0m`,
  dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
  categoryColor: (s) => `\x1b[35m${s}\x1b[0m`,
  shortcutColor: (s) => `\x1b[2m${s}\x1b[0m`,
};

export interface CommandPaletteOptions {
  commands: Command[];
  theme?: Partial<CommandPaletteTheme>;
  maxVisible?: number;
  width?: number;
  onCancel?: () => void;
  placeholder?: string;
}

/**
 * CommandPalette - quick command launcher
 * 
 * @example
 * const palette = new CommandPalette({
 *   commands: [
 *     { id: 'save', label: 'Save File', shortcut: 'Ctrl+S', onExecute: () => {} },
 *     { id: 'open', label: 'Open File', category: 'File', onExecute: () => {} },
 *   ],
 *   onCancel: () => palette.close(),
 * });
 */
export class CommandPalette implements UIElement, InteractiveElement {
  private commands: Command[];
  private filteredCommands: Command[] = [];
  private theme: CommandPaletteTheme;
  private maxVisible: number;
  private requestedWidth: number;
  private onCancel?: () => void;
  private placeholder: string;
  
  private query = '';
  private selectedIndex = 0;
  private scrollOffset = 0;
  
  public isFocused = false;

  constructor(options: CommandPaletteOptions) {
    this.commands = options.commands;
    this.filteredCommands = [...this.commands];
    this.theme = { ...defaultTheme, ...options.theme };
    this.maxVisible = Math.max(5, options.maxVisible ?? 10);
    this.requestedWidth = options.width ?? 60;
    this.onCancel = options.onCancel;
    this.placeholder = options.placeholder ?? 'Type to search...';
  }

  /**
   * Filter commands based on query
   */
  private filterCommands(): void {
    if (!this.query) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = fuzzyFilter(this.commands, this.query, (cmd: Command) => cmd.label);
    }
    this.selectedIndex = 0;
    this.scrollOffset = 0;
  }

  /**
   * Move selection up
   */
  private moveUp(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.adjustScroll();
    }
  }

  /**
   * Move selection down
   */
  private moveDown(): void {
    if (this.selectedIndex < this.filteredCommands.length - 1) {
      this.selectedIndex++;
      this.adjustScroll();
    }
  }

  /**
   * Execute selected command
   */
  private executeSelected(): void {
    const cmd = this.filteredCommands[this.selectedIndex];
    if (cmd) {
      cmd.onExecute();
    }
  }

  /**
   * Adjust scroll to keep selection visible
   */
  private adjustScroll(): void {
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + this.maxVisible) {
      this.scrollOffset = this.selectedIndex - this.maxVisible + 1;
    }
  }

  handleKey(event: KeyEvent): void {
    const key = event.name;

    switch (key) {
      case 'ArrowUp':
        this.moveUp();
        break;
      case 'ArrowDown':
        this.moveDown();
        break;
      case 'Enter':
      case 'return':
        this.executeSelected();
        break;
      case 'Escape':
        this.onCancel?.();
        break;
      case 'Backspace':
        if (this.query.length > 0) {
          this.query = this.query.slice(0, -1);
          this.filterCommands();
        }
        break;
      default:
        // Add printable characters to query
        if (event.raw && event.raw.length === 1 && event.raw.charCodeAt(0) >= 32) {
          this.query += event.raw;
          this.filterCommands();
        }
    }
  }

  clearCache(): void {
    // No persistent cache
  }

  draw(context: RenderContext): string[] {
    const width = Math.min(this.requestedWidth, context.width - 4);
    const contentWidth = width - 4; // Account for borders and padding
    const lines: string[] = [];

    // Top border
    lines.push(this.theme.borderColor('┌' + '─'.repeat(width - 2) + '┐'));

    // Search input line
    const queryDisplay = this.query || this.theme.dimColor(this.placeholder);
    const prefix = '> ';
    const searchLine = prefix + queryDisplay;
    const paddedSearch = searchLine.padEnd(contentWidth).slice(0, contentWidth);
    lines.push(this.theme.borderColor('│ ') + this.theme.bgColor(this.theme.fgColor(paddedSearch)) + this.theme.borderColor(' │'));

    // Separator
    lines.push(this.theme.borderColor('├' + '─'.repeat(width - 2) + '┤'));

    // Calculate visible range
    const visibleCount = Math.min(this.filteredCommands.length, this.maxVisible);
    this.adjustScroll();
    const endIndex = Math.min(this.scrollOffset + visibleCount, this.filteredCommands.length);

    // Render visible commands
    if (this.filteredCommands.length === 0) {
      const noMatch = this.theme.dimColor('No matching commands');
      lines.push(this.theme.borderColor('│ ') + noMatch.padEnd(contentWidth) + this.theme.borderColor(' │'));
    } else {
      for (let i = this.scrollOffset; i < endIndex; i++) {
        const cmd = this.filteredCommands[i]!;
        const isSelected = i === this.selectedIndex;
        
        let line = '';
        
        // Category prefix
        if (cmd.category) {
          line += this.theme.categoryColor(`[${cmd.category}] `);
        }
        
        // Label
        line += cmd.label;
        
        // Pad and truncate
        const availableWidth = cmd.shortcut ? contentWidth - visibleWidth(cmd.shortcut) - 2 : contentWidth;
        const displayed = truncateText(line, availableWidth, '');
        const padded = displayed.padEnd(contentWidth);
        
        // Add shortcut if available
        let finalLine = padded;
        if (cmd.shortcut) {
          finalLine = padded.slice(0, -visibleWidth(cmd.shortcut) - 1) + ' ' + this.theme.shortcutColor(cmd.shortcut);
        }

        // Style based on selection
        const styledLine = isSelected ? 
          this.theme.selectedBg(this.theme.selectedFg(finalLine)) :
          this.theme.bgColor(this.theme.fgColor(finalLine));

        const marker = isSelected ? CURSOR_MARKER : '';
        lines.push(this.theme.borderColor('│ ') + marker + styledLine + this.theme.borderColor(' │'));
      }
    }

    // Fill remaining space if needed
    const currentItems = endIndex - this.scrollOffset;
    for (let i = currentItems; i < this.maxVisible; i++) {
      lines.push(this.theme.borderColor('│ ') + ' '.repeat(contentWidth) + this.theme.borderColor(' │'));
    }

    // Bottom border
    lines.push(this.theme.borderColor('└' + '─'.repeat(width - 2) + '┘'));

    return lines;
  }
}
