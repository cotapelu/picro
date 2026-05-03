import { describe, it, expect } from 'vitest';
import { EarendilMessage } from '../earendil-announcement.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('EarendilAnnouncement', () => {
  it('should render announcement text', () => {
    const msg = new EarendilMessage({ text: 'New feature available!' });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('New feature available!');
  });

  it('should default to empty', () => {
    const msg = new EarendilMessage();
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result).toEqual([]);
  });
});
