import type { UIElement, RenderContext } from './base.js';
import { SelectList, type SelectItem } from './select-list.js';

/**
 * Memory entry (simplified from @picro/memory)
 */
export interface MemoryEntry {
  id: string;
  content: string;
  score?: number; // 0-1 relevance
  metadata?: {
    source?: string;
    timestamp?: number;
    tags?: string[];
  };
}

export interface MemoryPanelOptions {
  memories: MemoryEntry[];
  maxDisplay?: number;
  onSelect?: (memory: MemoryEntry) => void;
  onDelete?: (id: string) => void;
}

/**
 * MemoryPanel - displays retrieved memories in a scrollable list
 */
export class MemoryPanel implements UIElement {
  private memories: MemoryEntry[];
  private maxDisplay: number;
  private onSelect?: (memory: MemoryEntry) => void;
  private onDelete?: (id: string) => void;
  private selectList: SelectList;
  private items: SelectItem[] = [];

  constructor(options: MemoryPanelOptions) {
    this.memories = options.memories;
    this.maxDisplay = options.maxDisplay ?? 10;
    this.onSelect = options.onSelect;
    this.onDelete = options.onDelete;
    this.selectList = new SelectList(
      this.buildItems(),
      this.maxDisplay,
      {},
      (value) => {
        const mem = this.memories.find(m => m.id === value);
        if (mem) this.onSelect?.(mem);
      },
      () => {}
    );
  }

  setMemories(memories: MemoryEntry[]): void {
    this.memories = memories;
    this.items = this.buildItems();
    this.selectList.setItems(this.items);
  }

  private buildItems(): SelectItem[] {
    const displayList = this.memories.slice(0, this.maxDisplay);
    return displayList.map(m => {
      const snippet = this.truncate(m.content, 80);
      const score = m.score !== undefined ? `[${(m.score * 100).toFixed(0)}%] ` : '';
      const meta = m.metadata?.source ? `[${m.metadata.source}]` : '';
      const label = `${score}${snippet}${meta}`;
      return {
        value: m.id,
        label,
      };
    });
  }

  private truncate(str: string, max: number): string {
    if (str.length <= max) return str;
    return str.substring(0, max - 3) + '...';
  }

  draw(context: RenderContext): string[] {
    // Reuse SelectList rendering
    return this.selectList.draw(context);
  }

  clearCache(): void {}
}
