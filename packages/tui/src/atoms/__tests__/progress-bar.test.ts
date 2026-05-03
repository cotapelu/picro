import { describe, it, expect } from 'vitest';
import { ProgressBar } from '../progress-bar.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('ProgressBar', () => {
  it('should render a bar', () => {
    const pb = new ProgressBar(0.5);
    const ctx = createContext(80, 24);
    const result = pb.draw(ctx);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should render 0% value', () => {
    const pb = new ProgressBar(0);
    const ctx = createContext(80, 24);
    const result = pb.draw(ctx);
    // Just check it renders something
    expect(result.length).toBeGreaterThan(0);
  });

  it('should render 100% value', () => {
    const pb = new ProgressBar(1);
    const ctx = createContext(80, 24);
    const result = pb.draw(ctx);
    expect(result.length).toBeGreaterThan(0);
  });
});
