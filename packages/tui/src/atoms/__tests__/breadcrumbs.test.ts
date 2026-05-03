import { describe, it, expect } from 'vitest';
import { Breadcrumbs } from '../breadcrumbs.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Breadcrumbs Component', () => {
  it('should render path segments', () => {
    const bc = new Breadcrumbs(['home', 'projects', 'my-app']);
    const ctx = createContext(80, 24);
    const result = bc.draw(ctx);

    expect(result.join('\n')).toContain('home');
    expect(result.join('\n')).toContain('projects');
    expect(result.join('\n')).toContain('my-app');
  });

  it('should handle single segment', () => {
    const bc = new Breadcrumbs(['root']);
    const ctx = createContext(80, 24);
    const result = bc.draw(ctx);

    expect(result.join('\n')).toContain('root');
  });

  it('should handle empty array', () => {
    const bc = new Breadcrumbs([]);
    const ctx = createContext(80, 24);
    const result = bc.draw(ctx);

    expect(result).toEqual([]);
  });
});
