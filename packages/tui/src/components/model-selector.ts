/**
 * ModelSelector Component
 * Select AI model with info display
 */
import type { UIElement, RenderContext, KeyEvent, InteractiveElement } from './base.js';
import { visibleWidth, truncateText } from './internal-utils.js';
import { SelectList, type SelectItem } from './select-list.js';
import { Box } from './box.js';
import { Spacer } from './spacer.js';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextWindow?: number;
  supportsImages?: boolean;
  supportsStreaming?: boolean;
  costPer1kTokens?: number;
}

export interface ModelSelectorTheme {
  bgColor: (s: string) => string;
  fgColor: (s: string) => string;
  borderColor: (s: string) => string;
  headerColor: (s: string) => string;
  selectedBg: (s: string) => string;
  selectedFg: (s: string) => string;
  dimColor: (s: string) => string;
  accentColor: (s: string) => string;
}

const defaultTheme: ModelSelectorTheme = {
  bgColor: (s) => `\x1b[48;5;234m${s}\x1b[0m`,
  fgColor: (s) => `\x1b[37m${s}\x1b[0m`,
  borderColor: (s) => `\x1b[90m${s}\x1b[0m`,
  headerColor: (s) => `\x1b[1;36m${s}\x1b[0m`,
  selectedBg: (s) => `\x1b[48;5;25m${s}\x1b[0m`,
  selectedFg: (s) => `\x1b[97m${s}\x1b[0m`,
  dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
  accentColor: (s) => `\x1b[33m${s}\x1b[0m`,
};

export interface ModelSelectorOptions {
  models: ModelInfo[];
  selectedId?: string;
  theme?: Partial<ModelSelectorTheme>;
  width?: number;
  maxVisible?: number;
  onSelect?: (model: ModelInfo) => void;
  onCancel?: () => void;
}

/**
 * ModelSelector - AI model chooser with details
 * 
 * @example
 * const selector = new ModelSelector({
 *   models: [
 *     { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', contextWindow: 8192 },
 *     { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic', contextWindow: 200000 },
 *   ],
 *   onSelect: (m) => console.log('Selected:', m.name),
 *   onCancel: () => console.log('Cancelled'),
 * });
 */
export class ModelSelector implements UIElement, InteractiveElement {
  private models: ModelInfo[];
  private filteredModels: ModelInfo[] = [];
  private theme: ModelSelectorTheme;
  private maxVisible: number;
  private requestedWidth: number;
  private onSelect?: (model: ModelInfo) => void;
  private onCancel?: () => void;
  
  private selectedIndex = 0;
  private scrollOffset = 0;
  private searchQuery = '';
  
  public isFocused = false;

  constructor(options: ModelSelectorOptions) {
    this.models = options.models;
    this.filteredModels = [...this.models];
    this.theme = { ...defaultTheme, ...options.theme };
    this.maxVisible = Math.max(5, options.maxVisible ?? 8);
    this.requestedWidth = options.width ?? 70;
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
    
    // Set initial selection
    if (options.selectedId) {
      const idx = this.models.findIndex(m => m.id === options.selectedId);
      if (idx >= 0) this.selectedIndex = idx;
    }
  }

  private filterModels(): void {
    if (!this.searchQuery) {
      this.filteredModels = [...this.models];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredModels = this.models.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }
    this.selectedIndex = 0;
    this.scrollOffset = 0;
  }

  private moveUp(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.adjustScroll();
    }
  }

  private moveDown(): void {
    if (this.selectedIndex < this.filteredModels.length - 1) {
      this.selectedIndex++;
      this.adjustScroll();
    }
  }

  private adjustScroll(): void {
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + this.maxVisible) {
      this.scrollOffset = this.selectedIndex - this.maxVisible + 1;
    }
  }

  private executeSelected(): void {
    const model = this.filteredModels[this.selectedIndex];
    if (model && this.onSelect) {
      this.onSelect(model);
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
        if (this.searchQuery.length > 0) {
          this.searchQuery = this.searchQuery.slice(0, -1);
          this.filterModels();
        }
        break;
      default:
        if (event.raw && event.raw.length === 1 && event.raw.charCodeAt(0) >= 32) {
          this.searchQuery += event.raw;
          this.filterModels();
        }
    }
  }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    const width = Math.min(this.requestedWidth, context.width - 4);
    const contentWidth = width - 4;
    const lines: string[] = [];

    // Header
    const title = 'Select Model';
    const titlePadded = title.padStart((width + title.length) / 2).padEnd(width);
    lines.push(this.theme.headerColor('┌' + '─'.repeat(width - 2) + '┐'));
    lines.push(this.theme.borderColor('│') + this.theme.headerColor(titlePadded) + this.theme.borderColor('│'));

    // Search bar
    lines.push(this.theme.borderColor('├' + '─'.repeat(width - 2) + '┤'));
    const searchPrefix = 'Search: ';
    const searchDisplay = this.searchQuery || this.theme.dimColor('Type to filter...');
    const searchLine = searchPrefix + searchDisplay;
    lines.push(this.theme.borderColor('│ ') + searchLine.padEnd(contentWidth).slice(0, contentWidth) + this.theme.borderColor(' │'));
    lines.push(this.theme.borderColor('├' + '─'.repeat(width - 2) + '┤'));

    // Model list
    const visibleCount = Math.min(this.filteredModels.length, this.maxVisible);
    this.adjustScroll();
    const endIndex = Math.min(this.scrollOffset + visibleCount, this.filteredModels.length);

    if (this.filteredModels.length === 0) {
      const noMatch = this.theme.dimColor('No models match your search');
      lines.push(this.theme.borderColor('│ ') + noMatch.padEnd(contentWidth) + this.theme.borderColor(' │'));
    } else {
      for (let i = this.scrollOffset; i < endIndex; i++) {
        const model = this.filteredModels[i]!;
        const isSelected = i === this.selectedIndex;
        
        // Format: [Provider] Model Name
        let line = '';
        line += this.theme.dimColor(`[${model.provider}] `);
        line += model.name;
        
        // Truncate and pad
        const displayed = truncateText(line, contentWidth - 2, '');
        const padded = displayed.padEnd(contentWidth);
        
        // Style
        const styled = isSelected ?
          this.theme.selectedBg(this.theme.selectedFg(padded)) :
          this.theme.bgColor(this.theme.fgColor(padded));
        
        lines.push(this.theme.borderColor('│ ') + styled + this.theme.borderColor(' │'));
      }
    }

    // Fill empty slots
    const currentItems = endIndex - this.scrollOffset;
    for (let i = currentItems; i < this.maxVisible; i++) {
      lines.push(this.theme.borderColor('│ ') + ' '.repeat(contentWidth) + this.theme.borderColor(' │'));
    }

    // Info section
    lines.push(this.theme.borderColor('├' + '─'.repeat(width - 2) + '┤'));
    const selected = this.filteredModels[this.selectedIndex];
    if (selected) {
      // Info lines
      const infoLines: string[] = [];
      
      // Description
      if (selected.description) {
        infoLines.push(selected.description);
      infoLines.push(selected.description);
      }
      
      // Features
      const features: string[] = [];
      if (selected.contextWindow) features.push(`${selected.contextWindow.toLocaleString()} tokens`);
      if (selected.supportsImages) features.push('📷 Images');
      if (selected.supportsStreaming) features.push('⚡ Streaming');
      if (selected.costPer1kTokens) features.push(`$${selected.costPer1kTokens}/1K tokens`);
      
      if (features.length) {
        infoLines.push(this.theme.dimColor(features.join(' • ')));
      }

      for (const info of infoLines) {
        lines.push(this.theme.borderColor('│ ') + 
                    truncateText(info, contentWidth, '').padEnd(contentWidth) + 
                    this.theme.borderColor(' │'));
      }
    }

    // Bottom border
    lines.push(this.theme.borderColor('└' + '─'.repeat(width - 2) + '┘'));

    return lines;
  }
}
