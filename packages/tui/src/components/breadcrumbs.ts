/**
 * Breadcrumbs Component
 * Navigation path display
 */
import type { UIElement, RenderContext } from '../tui.js';
import { visibleWidth, truncateText } from '../utils.js';

export interface BreadcrumbItem {
  label: string;
  value: string;
  icon?: string;
}

export interface BreadcrumbsTheme {
  separatorColor: (s: string) => string;
  itemColor: (s: string) => string;
  activeItemColor: (s: string) => string;
  dimColor: (s: string) => string;
}

const defaultTheme: BreadcrumbsTheme = {
  separatorColor: (s) => `\x1b[90m${s}\x1b[0m`,
  itemColor: (s) => `\x1b[36m${s}\x1b[0m`,
  activeItemColor: (s) => `\x1b[1;37m${s}\x1b[0m`,
  dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
};

export interface BreadcrumbsOptions {
  items: BreadcrumbItem[];
  separator?: string;
  theme?: Partial<BreadcrumbsTheme>;
  showHome?: boolean;
  homeIcon?: string;
  onSelect?: (item: BreadcrumbItem) => void;
}

export class Breadcrumbs implements UIElement {
  private items: BreadcrumbItem[];
  private separator: string;
  private theme: BreadcrumbsTheme;
  private showHome: boolean;
  private homeIcon: string;
  private onSelect?: (item: BreadcrumbItem) => void;

  constructor(options: BreadcrumbsOptions) {
    this.items = options.items;
    this.separator = options.separator ?? ' / ';
    this.theme = { ...defaultTheme, ...options.theme };
    this.showHome = options.showHome ?? true;
    this.homeIcon = options.homeIcon ?? '🏠';
  }

  setItems(items: BreadcrumbItem[]): void {
    this.items = items;
  }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    const parts: string[] = [];
    
    if (this.showHome) {
      parts.push(this.theme.dimColor(this.homeIcon));
    }

    this.items.forEach((item, index) => {
      const isLast = index === this.items.length - 1;
      const label = item.icon ? `${item.icon} ${item.label}` : item.label;
      
      if (isLast) {
        parts.push(this.theme.activeItemColor(label));
      } else {
        parts.push(this.theme.itemColor(label));
      }
    });

    const line = parts.join(this.theme.separatorColor(this.separator));
    return [truncateText(line, context.width, '…')];
  }
}
