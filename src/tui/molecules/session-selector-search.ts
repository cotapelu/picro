/**
 * Session Selector Search Component
 * Search functionality for sessions
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../core/base';

export interface SessionSearchResult {
  id: string;
  name: string;
  cwd: string;
}

export interface SessionSearchSelectorOptions {
  sessions: SessionSearchResult[];
  onSelect?: (session: SessionSearchResult) => void;
  onCancel?: () => void;
}

export class SessionSearchSelector implements UIElement, InteractiveElement {
  private sessions: SessionSearchResult[];
  private searchQuery: string = '';
  private results: SessionSearchResult[] = [];
  private selectedIndex: number = 0;
  private onSelect?: (session: SessionSearchResult) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: SessionSearchSelectorOptions) {
    this.sessions = options.sessions;
    this.results = options.sessions;
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Search Sessions ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    
    const searchDisplay = ' Search: ' + (this.searchQuery || '_');
    lines.push('│' + searchDisplay + ' '.repeat(Math.max(0, borderWidth - searchDisplay.length)) + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    // Filter sessions based on searchQuery (case-insensitive prefix)
    const filtered = this.searchQuery
      ? this.sessions.filter(s => s.name.toLowerCase().startsWith(this.searchQuery.toLowerCase()))
      : this.sessions;
    for (let i = 0; i < filtered.length && i < context.height - 8; i++) {
      const result = filtered[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      lines.push('│' + prefix + result.name + ' '.repeat(Math.max(0, borderWidth - prefix.length - result.name.length)) + '│');
    }

    while (lines.length < context.height - 1) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('└' + '─'.repeat(borderWidth) + '┘');
    return lines;
  }

  handleKey(key: KeyEvent): void {
    const data = key.raw;
    if (data === '\x1b') { this.onCancel?.(); return; }
    if (data === '\r') { 
      const result = this.results[this.selectedIndex];
      if (result) this.onSelect?.(result);
      return;
    }
    if (data === '\x7f' || data === '\b') {
      this.searchQuery = this.searchQuery.slice(0, -1);
      return;
    }
    if (data.length === 1) {
      this.searchQuery += data;
    }
  }

  clearCache(): void { }
}
