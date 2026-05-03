import { describe, it, expect } from 'vitest';
import { Rating, type RatingOptions } from '../rating.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Rating', () => {
  it('should render stars based on value', () => {
    const rating = new Rating({ value: 3 });
    const ctx = createContext(80, 24);
    const result = rating.draw(ctx);

    expect(result.join('\n')).toContain('★');
  });

  it('should render max stars', () => {
    const rating = new Rating({ value: 5, maxStars: 5 });
    const ctx = createContext(80, 24);
    const result = rating.draw(ctx);

    const filled = (result.join('\n').match(/\★/g) || []).length;
    expect(filled).toBe(5);
  });

  it('should render label when showLabel=true', () => {
    const rating = new Rating({ value: 4, label: 'Quality' });
    const ctx = createContext(80, 24);
    const result = rating.draw(ctx);

    expect(result.join('\n')).toContain('Quality');
  });

  it('should update value', () => {
    const rating = new Rating({ value: 1 });
    rating.setValue(4);
    expect(rating.value).toBe(4);
  });
});
