import { SelectList, type SelectItem } from './select-list.js';

/**
 * File entry information
 */
export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number; // bytes, optional
}

/**
 * FileBrowser component - browse files and directories
 * Simple version: parent provides entries (via readdir) and handles navigation.
 */
export class FileBrowser {
  private selectList: SelectList;
  private entries: FileEntry[];

  constructor(
    entries: FileEntry[],
    visibleRows: number,
    onSelect?: (entry: FileEntry) => void
  ) {
    this.entries = entries;
    const items = this.formatItems(entries);
    this.selectList = new SelectList(
      items,
      visibleRows,
      {},
      (value) => {
        const entry = entries.find(e => e.path === value);
        if (entry) onSelect?.(entry);
      },
      () => {}
    );
  }

  private formatItems(entries: FileEntry[]): SelectItem[] {
    return entries.map(e => ({
      value: e.path,
      label: this.formatLabel(e),
    }));
  }

  private formatLabel(e: FileEntry): string {
    const icon = e.isDir ? '📁' : '📄';
    const name = e.name.endsWith('/') ? e.name.slice(0, -1) : e.name;
    return `${icon} ${name}`;
  }

  /**
   * Update file entries (e.g., after directory change)
   */
  setEntries(entries: FileEntry[]): void {
    this.entries = entries;
    this.selectList.setItems(this.formatItems(entries));
  }

  /**
   * Get SelectList for focus/keyboard handling
   */
  getSelectList(): SelectList {
    return this.selectList;
  }

  // Delegate drawing
  draw(context: any): string[] {
    return this.selectList.draw(context);
  }

  clearCache(): void {}
}
