/**
 * Auth Selector Status Component
 * Displays authentication status for providers
 */

import type { UIElement, RenderContext } from './base';
import { visibleWidth } from './internal-utils';

export interface AuthStatusDisplay {
  providerId: string;
  status: 'authenticated' | 'expired' | 'none' | 'error';
  email?: string;
}

export interface AuthSelectorStatusOptions {
  statuses?: AuthStatusDisplay[];
}

export class AuthSelectorStatus implements UIElement {
  private statuses: AuthStatusDisplay[];

  constructor(options: AuthSelectorStatusOptions = {}) {
    this.statuses = options.statuses || [
      { providerId: 'anthropic', status: 'none' },
      { providerId: 'openai', status: 'none' },
    ];
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' Authentication Status ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (const status of this.statuses) {
      const icon = status.status === 'authenticated' ? '✓' : status.status === 'expired' ? '⚠' : status.status === 'error' ? '✗' : '○';
      const nameCol = status.providerId.padEnd(15);
      const line = ' ' + icon + ' ' + nameCol + ' ' + status.status;
      lines.push('│' + line + ' '.repeat(borderWidth - line.length) + '│');
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
