import { describe, it, expect } from 'vitest';
import { EarendilAnnouncementComponent } from '../earendil-announcement.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('EarendilAnnouncementComponent', () => {
  it('should render announcement with pi and Earendil', () => {
    const msg = new EarendilAnnouncementComponent();
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('pi has joined Earendil');
    expect(result.join('\n')).toContain('Read the blog post');
  });

  it('should include URL', () => {
    const msg = new EarendilAnnouncementComponent();
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('https://mariozechner.at');
  });
});
