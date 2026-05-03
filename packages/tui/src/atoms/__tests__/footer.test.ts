import { describe, it, expect } from 'vitest';
import { Footer, type FooterItem } from '../footer.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Footer Component', () => {
  it('should render left and right items', () => {
    const footer = new Footer({
      leftItems: [{ key: 'status', label: 'Ready' }],
      rightItems: [{ key: 'info', label: 'v1.0' }],
    });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.some(l => l.includes('Ready'))).toBe(true);
    expect(result.some(l => l.includes('v1.0'))).toBe(true);
  });

  it('should handle empty items', () => {
    const footer = new Footer({ leftItems: [], rightItems: [] });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('should update items dynamically', () => {
    const footer = new Footer({ leftItems: [], rightItems: [] });
    footer.leftItems = [{ key: 'new', label: 'Updated' }];
    footer.clearCache();

    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.some(l => l.includes('Updated'))).toBe(true);
  });
});
