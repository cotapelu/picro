import type { UIElement, RenderContext } from '../core/base';
import { truncateText } from '../core/internal-utils';

export interface ToolCallInfo {
  name: string;
  status: 'running' | 'success' | 'error';
  output?: string;
  error?: string;
  args?: unknown;
  startTime?: number;
  duration?: number;
}

export interface ToolExecutionOptions {
  tools?: ToolCallInfo[];
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export interface ToolExecutionOptions {
  tools?: ToolCallInfo[];
}

export class ToolExecutionMessage implements UIElement {
  private tools: ToolCallInfo[];
  private expanded: boolean;
  private onToggle?: (expanded: boolean) => void;
  private cache?: { width: number; lines: string[] };

  constructor(options: ToolExecutionOptions = {}) {
    this.tools = options.tools || [];
    this.expanded = options.expanded ?? false;
    this.onToggle = options.onToggle;
  }

  addToolCall(tool: ToolCallInfo): void {
    this.tools.push(tool);
    this.clearCache();
  }

  updateTool(toolCallId: string, updates: Partial<ToolCallInfo>): void {
    // Find tool by name (since we don't have ID, use name as identifier)
    const tool = this.tools.find(t => t.name === toolCallId);
    if (tool) {
      Object.assign(tool, updates);
      this.clearCache();
    }
  }

  setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.clearCache();
    this.onToggle?.(expanded);
  }

  toggleExpanded(): void {
    this.setExpanded(!this.expanded);
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;

    // Check cache
    if (this.cache && this.cache.width === width) {
      return this.cache.lines;
    }

    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Tool Execution ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');

    // Divider line
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (const tool of this.tools) {
      const icon = tool.status === 'running' ? '⏳' : tool.status === 'success' ? '✓' : '✗';
      const line = ' ' + icon + ' ' + tool.name;
      lines.push('│' + line + ' '.repeat(borderWidth - line.length) + '│');
      
      if (tool.output && this.expanded) {
        const outputLines = tool.output.split('\n');
        for (const outLine of outputLines) {
          const trimmed = truncateText(outLine, borderWidth - 4);
          lines.push('│   ' + trimmed + ' '.repeat(borderWidth - trimmed.length - 3) + '│');
        }
      } else if (tool.output) {
        const preview = truncateText(tool.output, borderWidth - 10);
        const hint = this.expanded ? '▼' : '▶';
        lines.push('│   ' + hint + ' ' + preview + ' '.repeat(Math.max(0, borderWidth - preview.length - 6)) + '│');
      }
    }

    // Footer line if collapsed
    if (!this.expanded && this.tools.length > 0) {
      lines.push('├' + '─'.repeat(borderWidth) + '┤');
      const hint = 'Press E to expand tool outputs';
      const pad = ' '.repeat(Math.max(0, Math.floor((borderWidth - hint.length) / 2)));
      lines.push('│' + pad + '\x1b[90m' + hint + '\x1b[0m' + ' '.repeat(borderWidth - hint.length - pad.length) + '│');
    }

    while (lines.length < context.height - 1) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    // Cache
    this.cache = { width, lines };
    return lines;
  }

  clearCache(): void {
    this.cache = undefined;
  }
}
