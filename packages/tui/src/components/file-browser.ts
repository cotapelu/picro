/**
 * FileBrowser Component
 * Browse and select files/directories
 */
import type { UIElement, RenderContext, KeyEvent, InteractiveElement, PanelHandle } from './base.js';
import type { TerminalUI } from '../tui.js';
import { visibleWidth, truncateText } from './internal-utils.js';

export interface FileItem {
  name: string;
  displayName: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  modified?: Date;
  isHidden?: boolean;
  isSeparator?: boolean;
}

export interface FileBrowserTheme {
  bgColor: (s: string) => string;
  fgColor: (s: string) => string;
  borderColor: (s: string) => string;
  directoryColor: (s: string) => string;
  fileColor: (s: string) => string;
  hiddenColor: (s: string) => string;
  selectedBg: (s: string) => string;
  selectedFg: (s: string) => string;
  dimColor: (s: string) => string;
  accentColor: (s: string) => string;
}

const defaultTheme: FileBrowserTheme = {
  bgColor: (s) => `\x1b[48;5;234m${s}\x1b[0m`,
  fgColor: (s) => `\x1b[37m${s}\x1b[0m`,
  borderColor: (s) => `\x1b[90m${s}\x1b[0m`,
  directoryColor: (s) => `\x1b[36m${s}\x1b[0m`,
  fileColor: (s) => `\x1b[37m${s}\x1b[0m`,
  hiddenColor: (s) => `\x1b[90m${s}\x1b[0m`,
  selectedBg: (s) => `\x1b[48;5;25m${s}\x1b[0m`,
  selectedFg: (s) => `\x1b[97m${s}\x1b[0m`,
  dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
  accentColor: (s) => `\x1b[33m${s}\x1b[0m`,
};

const SEPARATOR: FileItem = {
  name: '',
  displayName: '─'.repeat(40),
  type: 'file',
  path: '',
  isSeparator: true,
};

export interface FileBrowserOptions {
  initialPath?: string;
  items: FileItem[];
  theme?: Partial<FileBrowserTheme>;
  showHidden?: boolean;
  canSelectFile?: boolean;
  canSelectDirectory?: boolean;
  allowCreate?: boolean;
  onSelect?: (item: FileItem) => void;
  onNavigate?: (path: string) => void;
  onCancel?: () => void;
}

/**
 * FileBrowser - file/directory browser
 * 
 * @example
 * const browser = new FileBrowser({
 *   items: fileList,
 *   onSelect: (item) => console.log('Selected:', item.path),
 * });
 */
export class FileBrowser implements UIElement, InteractiveElement {
  private currentPath: string;
  private items: FileItem[];
  private filteredItems: FileItem[] = [];
  private theme: FileBrowserTheme;
  private showHidden: boolean;
  private canSelectFile: boolean;
  private canSelectDirectory: boolean;
  private allowCreate: boolean;
  private onSelect?: (item: FileItem) => void;
  private onNavigate?: (path: string) => void;
  private onCancel?: () => void;
  
  private selectedIndex = 0;
  private scrollOffset = 0;
  private searchQuery = '';
  private showSearch = false;
  
  public isFocused = false;

  constructor(options: FileBrowserOptions) {
    this.currentPath = options.initialPath ?? '/';
    this.items = [SEPARATOR, ...options.items.filter(i => !i.isHidden || this.showHidden)];
    this.filteredItems = [...this.items];
    this.theme = { ...defaultTheme, ...options.theme };
    this.showHidden = options.showHidden ?? false;
    this.canSelectFile = options.canSelectFile ?? true;
    this.canSelectDirectory = options.canSelectDirectory ?? true;
    this.allowCreate = options.allowCreate ?? false;
    this.onSelect = options.onSelect;
    this.onNavigate = options.onNavigate;
    this.onCancel = options.onCancel;
  }

  /**
   * Update items (e.g., after navigation)
   */
  setItems(items: FileItem[], path?: string): void {
    this.items = [SEPARATOR, ...items];
    this.filteredItems = [...this.items];
    if (path) this.currentPath = path;
    this.selectedIndex = 0;
    this.scrollOffset = 0;
  }

  private filterItems(): void {
    if (!this.searchQuery) {
      this.filteredItems = [...this.items];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredItems = this.items.filter(i => 
        i.isSeparator || i.name.toLowerCase().includes(q)
      );
    }
    this.selectedIndex = 0;
    this.scrollOffset = 0;
  }

  private moveUp(): void {
    let newIndex = this.selectedIndex - 1;
    while (newIndex >= 0 && this.filteredItems[newIndex]?.isSeparator) {
      newIndex--;
    }
    if (newIndex >= 0) {
      this.selectedIndex = newIndex;
      this.adjustScroll();
    }
  }

  private moveDown(): void {
    let newIndex = this.selectedIndex + 1;
    while (newIndex < this.filteredItems.length && this.filteredItems[newIndex]?.isSeparator) {
      newIndex++;
    }
    if (newIndex < this.filteredItems.length) {
      this.selectedIndex = newIndex;
      this.adjustScroll();
    }
  }

  private adjustScroll(): void {
    const maxVisible = 12;
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + maxVisible) {
      this.scrollOffset = this.selectedIndex - maxVisible + 1;
    }
  }

  private selectCurrent(): void {
    const item = this.filteredItems[this.selectedIndex];
    if (!item || item.isSeparator) return;

    if (item.type === 'directory') {
      this.onNavigate?.(item.path);
    } else if (item.type === 'file' && this.canSelectFile) {
      this.onSelect?.(item);
    }
  }

  handleKey(event: KeyEvent): void {
    const key = event.name;

    if (this.showSearch) {
      switch (key) {
        case 'Enter':
          this.showSearch = false;
          return;
        case 'Escape':
          this.showSearch = false;
          this.searchQuery = '';
          this.filterItems();
          return;
        case 'Backspace':
          this.searchQuery = this.searchQuery.slice(0, -1);
          this.filterItems();
          return;
        default:
          if (event.raw?.length === 1 && event.raw.charCodeAt(0) >= 32) {
            this.searchQuery += event.raw;
            this.filterItems();
          }
          return;
      }
    }

    switch (key) {
      case 'ArrowUp':
        this.moveUp();
        break;
      case 'ArrowDown':
        this.moveDown();
        break;
      case 'Enter':
        this.selectCurrent();
        break;
      case 'Escape':
        this.onCancel?.();
        break;
      case '/':
      case 'f':
        if (event.modifiers?.ctrl) {
          this.showSearch = true;
        }
        break;
      case 'h':
        this.showHidden = !this.showHidden;
        this.filterItems();
        break;
    }
  }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    const width = Math.min(80, context.width - 4);
    const contentWidth = width - 4;
    const lines: string[] = [];
    const maxVisible = 12;

    // Header
    const pathDisplay = truncateText(this.currentPath, width - 10, '…');
    lines.push(this.theme.borderColor('┌' + '─'.repeat(width - 2) + '┐'));
    lines.push(this.theme.borderColor('│ ') + 
                this.theme.accentColor(`📁 ${pathDisplay}`).padEnd(contentWidth) + 
                this.theme.borderColor(' │'));

    // Search bar if active
    if (this.showSearch) {
      lines.push(this.theme.borderColor('├' + '─'.repeat(width - 2) + '┤'));
      const searchLine = `/${this.searchQuery}`;
      lines.push(this.theme.borderColor('│ ') + searchLine.padEnd(contentWidth) + 
                  this.theme.borderColor(' │'));
    }

    lines.push(this.theme.borderColor('├' + '─'.repeat(width - 2) + '┤'));

    // File list
    const visibleEnd = Math.min(this.scrollOffset + maxVisible, this.filteredItems.length);
    
    for (let i = this.scrollOffset; i < visibleEnd; i++) {
      const item = this.filteredItems[i];
      if (!item) continue;

      if (item.isSeparator) {
        lines.push(this.theme.borderColor('│ ') + 
                    this.theme.dimColor(item.displayName).padEnd(contentWidth) + 
                    this.theme.borderColor(' │'));
        continue;
      }

      const isSelected = i === this.selectedIndex;
      let line = '';

      // Icon
      if (item.type === 'directory') {
        line += item.isHidden ? this.theme.hiddenColor('📂 ') : this.theme.directoryColor('📂 ');
      } else {
        line += item.isHidden ? this.theme.hiddenColor('📄 ') : this.theme.fileColor('📄 ');
      }

      // Name
      const nameColor = item.isHidden ? this.theme.hiddenColor : 
                       item.type === 'directory' ? this.theme.directoryColor : this.theme.fileColor;
      line += nameColor(item.displayName);

      // Truncate and pad
      const displayed = truncateText(line, contentWidth, '');
      const padded = displayed.padEnd(contentWidth);

      // Style based on selection
      const styled = isSelected ? 
        this.theme.selectedBg(this.theme.selectedFg(padded)) :
        this.theme.bgColor(padded);

      lines.push(this.theme.borderColor('│ ') + styled + this.theme.borderColor(' │'));
    }

    // Fill remaining
    for (let i = visibleEnd - this.scrollOffset; i < maxVisible; i++) {
      lines.push(this.theme.borderColor('│ ') + ' '.repeat(contentWidth) + this.theme.borderColor(' │'));
    }

    // Footer with hints
    lines.push(this.theme.borderColor('├' + '─'.repeat(width - 2) + '┤'));
    const hints = '↑↓=Navigate Enter=Select Esc=Back Ctrl+F=Search h=Toggle Hidden';
    lines.push(this.theme.borderColor('│ ') + this.theme.dimColor(hints).padEnd(contentWidth) + this.theme.borderColor(' │'));

    // Bottom border
    lines.push(this.theme.borderColor('└' + '─'.repeat(width - 2) + '┘'));

    return lines;
  }
}
