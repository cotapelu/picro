import { describe, it, expect } from 'vitest';
import { Footer, type FooterItem } from '../footer.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Footer', () => {
  it('should render left and right items', () => {
    const footer = new Footer({
      leftItems: [{ key: 'Ctrl+S', label: 'Save' }],
      rightItems: [{ key: 'Ctrl+Q', label: 'Quit' }],
    });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.join('\n')).toContain('Save');
    expect(result.join('\n')).toContain('Quit');
    expect(result.join('\n')).toContain('Ctrl+S');
    expect(result.join('\n')).toContain('Ctrl+Q');
  });

  it('should handle only left items', () => {
    const footer = new Footer({
      leftItems: [{ label: 'Status: Ready' }],
      rightItems: [],
    });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.join('\n')).toContain('Status: Ready');
  });

  it('should handle only right items', () => {
    const footer = new Footer({
      leftItems: [],
      rightItems: [{ label: 'v1.0' }],
    });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.join('\n')).toContain('v1.0');
  });

  it('should handle empty items', () => {
    const footer = new Footer({ leftItems: [], rightItems: [] });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
