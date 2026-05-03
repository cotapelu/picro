import { describe, it, expect } from 'vitest';
import { UserMessage } from '../user-message.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('UserMessage', () => {
  it('should render user content', () => {
    const msg = new UserMessage({ text: 'Hello Assistant' });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('Hello Assistant');
  });

  it('should default to empty', () => {
    const msg = new UserMessage();
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result).toEqual([]);
  });

  it('should set text', () => {
    const msg = new UserMessage({ text: 'Initial' });
    msg.setText('Updated');
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('Updated');
  });
});
