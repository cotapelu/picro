/**
 * Visual Truncate Component
 * Text truncation with visual handling
 */

import type { UIElement, RenderContext } from './base.js';
import { visibleWidth } from './internal-utils.js';

export interface VisualTruncateOptions {
  text: string;
  maxWidth: number;
}

export class VisualTruncate implements UIElement {
  private text: string;
  private maxWidth: number;

  constructor(options: VisualTruncateOptions) {
    this.text = options.text;
    this.maxWidth = options.maxWidth;
  }

  draw(context: RenderContext): string[] {
    const width = Math.min(this.maxWidth, context.width);
    const textW = visibleWidth(this.text);
    
    if (textW <= width) {
      return [this.text];
    }

    const ellipsis = '...';
    const ellipsisW = visibleWidth(ellipsis);
    const availW = width - ellipsisW;
    
    let result = '';
    let w = 0;
    for (const char of this.text) {
      const charW = visibleWidth(char);
      if (w + charW > availW) break;
      result += char;
      w += charW;
    }
    
    return [result + ellipsis];
  }

  clearCache(): void {
    // No cache
  }
}
