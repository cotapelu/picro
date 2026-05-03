import { describe, it, expect } from 'vitest';
import { ProgressBar } from '../progress-bar.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('ProgressBar Component', () => {
  it('should render a bar', () => {
    const pb = new ProgressBar(0.5);
    const ctx = createContext(80, 24);
    const result = pb.draw(ctx);

    expect(result.length).toBeGreaterThan(0);
  });

  it('should show 0% empty', () => {
    const pb = new ProgressBar(0);
    const ctx = createContext(80, 24);
    const result = pb.draw(ctx);

    expect(result.some(l => l.includes('0%'))).toBe(true);
  });

  it('should show 100% full', () => {
    const pb = new ProgressBar(1);
    const ctx = createContext(80, 24);
    const result = pb.draw(ctx);

    expect(result.some(l => l.includes('100%'))).toBe(true);
  });

  it('should update value', () => {
    const pb = new ProgressBar(0.3);
    pb.setValue(0.8);
    expect(pb.value).toBe(0.8);
  });
});
