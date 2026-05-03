import { describe, it, expect } from 'vitest';
import { Badge, type BadgeOptions } from '../badge.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Badge', () => {
  it('should render label with default variant', () => {
    const badge = new Badge({ label: 'Default' });
    const ctx = createContext(80, 24);
    const result = badge.draw(ctx);

    expect(result.some(l => l.includes('Default'))).toBe(true);
  });

  it('should apply variant colors', () => {
    const options: BadgeOptions = { label: 'Success', variant: 'success' };
    const badge = new Badge(options);
    const ctx = createContext(80, 24);
    const result = badge.draw(ctx);

    // success variant uses green background
    expect(result.join('\n')).toContain('\x1b[48;5;28m');
  });

  it('should handle prefix and suffix', () => {
    const badge = new Badge({ label: 'Count', prefix: '[', suffix: ']' });
    const ctx = createContext(80, 24);
    const result = badge.draw(ctx);

    expect(result.join('\n')).toContain('[');
    expect(result.join('\n')).toContain('Count');
    expect(result.join('\n')).toContain(']');
  });
});
