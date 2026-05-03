/**
 * Tool Execution Message Component
 * Displays tool execution results
 */

import type { UIElement, RenderContext } from '../atoms/base.js';
import { truncateText } from '../atoms/internal-utils.js';

export interface ToolCallInfo {
  name: string;
  status: 'running' | 'success' | 'error';
  output?: string;
  error?: string;
}

export interface ToolExecutionOptions {
  tools?: ToolCallInfo[];
}

export class ToolExecutionMessage implements UIElement {
  private tools: ToolCallInfo[];

  constructor(options: ToolExecutionOptions = {}) {
    this.tools = options.tools || [];
  }

  addToolCall(tool: ToolCallInfo): void {
    this.tools.push(tool);
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Tool Execution ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (const tool of this.tools) {
      const icon = tool.status === 'running' ? '⏳' : tool.status === 'success' ? '✓' : '✗';
      const line = ' ' + icon + ' ' + tool.name;
      lines.push('│' + line + ' '.repeat(borderWidth - line.length) + '│');
      
      if (tool.output) {
        const outputLine = '   ' + truncateText(tool.output, borderWidth - 4);
        lines.push('│' + outputLine + ' '.repeat(borderWidth - outputLine.length) + '│');
      }
    }

    while (lines.length < context.height - 1) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    return lines;
  }

  clearCache(): void {
    // No cache
  }
}
