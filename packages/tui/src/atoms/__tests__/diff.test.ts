import { describe, it, expect } from 'vitest';
import { Diff } from '../diff.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Diff Component', () => {
  it('should render diff output', () => {
    const diff = new Diff({
      old: 'line1\nline2',
      new: 'line1\nline2\nline3',
    });
    const ctx = createContext(80, 24);
    const result = diff.draw(ctx);

    expect(result.join('\n')).toContain('line3');
  });

  it('should show deletions with - prefix', () => {
    const diff = new Diff({
      old: 'deleted line',
      new: '',
    });
    const ctx = createContext(80, 24);
    const result = diff.draw(ctx);

    expect(result.some(l => l.includes('- deleted line'))).toBe(true);
  });

  it('should show additions with + prefix', () => {
    const diff = new Diff({
      old: '',
      new: 'added line',
    });
    const ctx = createContext(80, 24);
    const result = diff.draw(ctx);

    expect(result.some(l => l.includes('+ added line'))).toBe(true);
  });

  it('should handle identical content', () => {
    const diff = new Diff({
      old: 'same',
      new: 'same',
    });
    const ctx = createContext(80, 24);
    const result = diff.draw(ctx);

    expect(result.join('\n')).toContain('same');
  });
});
