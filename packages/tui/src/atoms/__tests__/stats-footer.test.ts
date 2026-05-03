import { describe, it, expect } from 'vitest';
import { StatsFooter } from '../stats-footer.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('StatsFooter', () => {
  it('should render stats items', () => {
    const footer = new StatsFooter();
    footer.setStats({
      cwd: '/home',
      tokens: { input: 100, output: 200 },
      cost: 0.05,
      contextPercent: 45,
      model: { name: 'gpt-4', provider: 'openai' },
    });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.join('\n')).toContain('/home');
    expect(result.join('\n')).toContain('45%');
    expect(result.join('\n')).toContain('gpt-4');
  });

  it('should handle minimal stats', () => {
    const footer = new StatsFooter();
    footer.setStats({ cwd: '.' });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.join('\n')).toContain('.');
  });

  it('should update when stats change', () => {
    const footer = new StatsFooter();
    footer.setStats({ cwd: 'dir1' });
    footer.setStats({ cwd: 'dir2' });
    const ctx = createContext(80, 24);
    const result = footer.draw(ctx);

    expect(result.some(l => l.includes('dir2'))).toBe(true);
  });
});
