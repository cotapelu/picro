import { describe, it, expect } from 'vitest';
import { StatsFooter } from '../stats-footer.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('StatsFooter Component', () => {
  it('should render stats items', () => {
    const footer = new StatsFooter({
      items: [
        { label: 'Tokens', value: 1234 },
        { label: 'Cost', value: '$0.05' },
      ],
    });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.join('\n')).toContain('Tokens');
    expect(result.join('\n')).toContain('1234');
    expect(result.join('\n')).toContain('Cost');
  });

  it('should handle empty items', () => {
    const footer = new StatsFooter({ items: [] });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('should update items', () => {
    const footer = new StatsFooter({ items: [] });
    footer.items = [{ label: 'New', value: 'Value' }];
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.join('\n')).toContain('New');
    expect(result.join('\n')).toContain('Value');
  });
});
