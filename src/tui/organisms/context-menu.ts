/**
 * ContextMenu Component
 * Popup menu for contextual actions
 */
import type { UIElement, RenderContext, KeyEvent, InteractiveElement } from '../atoms/base';
import { CURSOR_MARKER } from '../atoms/base';
import { visibleWidth, truncateText } from '../atoms/internal-utils';

export interface MenuItem {
  /** Unique ID */
  id: string;
  /** Display text */
  label: string;
  /** Optional icon/indicator */
  icon?: string;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Submenu items */
  submenu?: MenuItem[];
  /** Called when item selected */
  onSelect?: () => void;
}

export interface ContextMenuTheme {
  /** Border color */
  borderColor: (s: string) => string;
  /** Background */
  bgColor: (s: string) => string;
  /** Normal item text */
  itemColor: (s: string) => string;
  /** Selected item background */
  selectedBg: (s: string) => string;
  /** Selected item text */
  selectedFg: (s: string) => string;
  /** Disabled item */
  disabledColor: (s: string) => string;
  /** Shortcut key color */
  shortcutColor: (s: string) => string;
  /** Separator line */
  separatorColor: (s: string) => string;
}

export const contextMenuDefaultTheme: ContextMenuTheme = {
  borderColor: (s) => `\x1b[90m${s}\x1b[0m`,
  bgColor: (s) => `\x1b[48;5;236m${s}\x1b[0m`,
  itemColor: (s) => `\x1b[37m${s}\x1b[0m`,
  selectedBg: (s) => `\x1b[48;5;25m${s}\x1b[0m`,
  selectedFg: (s) => `\x1b[97m${s}\x1b[0m`,
  disabledColor: (s) => `\x1b[90m${s}\x1b[0m`,
  shortcutColor: (s) => `\x1b[2m${s}\x1b[0m`,
  separatorColor: (s) => `\x1b[90m${s}\x1b[0m`,
};

export interface ContextMenuOptions {
  /** Menu items */
  items: MenuItem[];
  /** Theme styling */
  theme?: Partial<ContextMenuTheme>;
  /** Max visible items before scrolling */
  maxVisible?: number;
  /** Width (auto if not specified) */
  width?: number;
  /** Called when menu closed */
  onClose?: () => void;
  /** Initial selected index */
  selectedIndex?: number;
}

/**
 * ContextMenu - popup menu component
 * 
 * @example
 * const menu = new ContextMenu({
 *   items: [
 *     { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C' },
 *     { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
 *     null, // separator
 *     { id: 'delete', label: 'Delete', disabled: true },
 *   ],
 *   onClose: () => console.log('menu closed'),
 * });
 */
export class ContextMenu implements UIElement, InteractiveElement {
  private items: (MenuItem | null)[];
  private theme: ContextMenuTheme;
  private maxVisible: number;
  private requestedWidth: number;
  private onClose?: () => void;
  private calculatedWidth: number = 0;
  
  private selectedIndex = 0;
  private scrollOffset = 0;
  
  public isFocused = false;

  constructor(options: ContextMenuOptions) {
    this.items = options.items.filter(Boolean);
    this.theme = { ...contextMenuDefaultTheme, ...options.theme };
    this.maxVisible = Math.max(3, options.maxVisible ?? 10);
    this.requestedWidth = options.width ?? 0;
    this.onClose = options.onClose;
    this.selectedIndex = options.selectedIndex ?? 0;
    this.clampSelection();
  }

  private clampSelection(): void {
    const maxIndex = this.items.length - 1;
    this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, maxIndex));
  }

  /**
   * Set menu items
   */
  setItems(items: MenuItem[]): void {
    this.items = items;
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.clampSelection();
  }

  /**
   * Get current selection
   */
  getSelectedItem(): MenuItem | null {
    const item = this.items[this.selectedIndex];
    if (!item || item.disabled) return null;
    return item;
  }

  /**
   * Select an item by ID
   */
  selectById(id: string): void {
    const index = this.items.findIndex(item => item?.id === id);
    if (index >= 0) {
      this.selectedIndex = index;
      this.clampSelection();
    }
  }

  private calculateWidth(): void {
    if (this.requestedWidth > 0) {
      this.calculatedWidth = this.requestedWidth;
      return;
    }

    let maxLen = 20; // minimum width
    for (const item of this.items) {
      if (!item) continue;
      let len = visibleWidth(item.label) + 4; // padding + border
      if (item.icon) len += 2;
      if (item.shortcut) len += visibleWidth(item.shortcut) + 2;
      maxLen = Math.max(maxLen, len);
    }
    this.calculatedWidth = Math.min(maxLen, 60);
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
        this.selectCurrent();
        break;
      case 'Escape':
        this.cancel();
        break;
      case 'Home':
        this.selectedIndex = 0;
        this.scrollOffset = 0;
        break;
      case 'End':
        this.selectedIndex = this.items.length - 1;
        this.adjustScroll();
        break;
    }
  }

  private moveUp(): void {
    do {
      this.selectedIndex--;
      if (this.selectedIndex < 0) {
        this.selectedIndex = this.items.length - 1;
      }
    } while (this.items[this.selectedIndex]?.disabled && this.selectedIndex > 0);
    this.adjustScroll();
  }

  private moveDown(): void {
    do {
      this.selectedIndex++;
      if (this.selectedIndex >= this.items.length) {
        this.selectedIndex = 0;
      }
    } while (this.items[this.selectedIndex]?.disabled && this.selectedIndex < this.items.length - 1);
    this.adjustScroll();
  }

  private adjustScroll(): void {
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + this.maxVisible) {
      this.scrollOffset = this.selectedIndex - this.maxVisible + 1;
    }
  }

  private selectCurrent(): void {
    const item = this.items[this.selectedIndex];
    if (item && !item.disabled) {
      item.onSelect?.();
    }
  }

  private cancel(): void {
    this.onClose?.();
  }

  clearCache(): void {
    // No persistent cache
  }

  draw(context: RenderContext): string[] {
    this.calculateWidth();
    const width = this.calculatedWidth;
    const contentWidth = width - 2; // minus borders
    const lines: string[] = [];

    // Top border
    lines.push(this.theme.borderColor('┌' + '─'.repeat(contentWidth) + '┐'));

    // Calculate visible range
    const visibleCount = Math.min(this.items.length, this.maxVisible);
    this.adjustScroll();
    const endIndex = Math.min(this.scrollOffset + visibleCount, this.items.length);

    // Render visible items
    for (let i = this.scrollOffset; i < endIndex; i++) {
      const isSelected = i === this.selectedIndex;
      const item = this.items[i];

      if (!item) {
        // Separator
        lines.push(this.theme.borderColor('├') + 
                   this.theme.separatorColor('─'.repeat(contentWidth)) + 
                   this.theme.borderColor('┤'));
        continue;
      }

      let line = '';
      
      // Icon
      if (item.icon) {
        line += item.icon + ' ';
      }

      // Label - truncate if needed
      const availableWidth = contentWidth - (item.shortcut ? visibleWidth(item.shortcut) + 4 : 2);
      let label = item.label;
      if (visibleWidth(label) > availableWidth) {
        label = truncateText(label, availableWidth, '…');
      }

      if (item.disabled) {
        line += this.theme.disabledColor(label);
      } else if (isSelected) {
        line += this.theme.selectedFg(label);
      } else {
        line += this.theme.itemColor(label);
      }

      // Pad to content width
      const padLen = contentWidth - visibleWidth(line);
      if (padLen > 0) {
        line += ' '.repeat(padLen);
      }

      // Shortcut
      if (item.shortcut) {
        const shortcut = this.theme.shortcutColor(item.shortcut);
        // Overwrite last chars if needed
        const shortcutWidth = visibleWidth(shortcut) + 2;
        line = line.slice(0, -shortcutWidth) + ' ' + shortcut;
      }

      const styled = this.theme.borderColor('│ ') + line + this.theme.borderColor(' │');
      
      if (isSelected) {
        lines.push(this.theme.selectedBg(styled));
        if (this.isFocused) {
          lines[lines.length - 1] = CURSOR_MARKER + lines[lines.length - 1];
        }
      } else {
        lines.push(styled);
      }
    }

    // Bottom border
    lines.push(this.theme.borderColor('└' + '─'.repeat(contentWidth) + '┘'));

    return lines;
  }
}

/**
 * Create a simple separator item
 */
export function menuSeparator(): null {
  return null;
}

/**
 * Helper to create menu items with standard structure
 */
export function createMenuItem(
  id: string,
  label: string,
  options: { icon?: string; shortcut?: string; disabled?: boolean; onSelect?: () => void } = {}
): MenuItem {
  return {
    id,
    label,
    icon: options.icon,
    shortcut: options.shortcut,
    disabled: options.disabled,
    onSelect: options.onSelect,
  };
}
