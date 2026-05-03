import { describe, it, expect } from 'vitest';
import { TruncatedText } from '../truncated-text.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('TruncatedText', () => {
  it('should truncate long text with ellipsis', () => {
    const tt = new TruncatedText({ text: 'This is a very long text', ellipsis: '...' });
    const ctx = createContext(10, 24);
    const result = tt.draw(ctx);

    expect(result.join('\n')).toContain('...');
  });

  it('should not truncate short text', () => {
    const tt = new TruncatedText({ text: 'Short' });
    const ctx = createContext(80, 24);
    const result = tt.draw(ctx);

    expect(result.join('\n')).toContain('Short');
    expect(result.join('\n')).not.toContain('...');
  });

  it('should wrap when wrap=true', () => {
    const tt = new TruncatedText({ text: 'A very long text that should wrap', wrap: true });
    const ctx = createContext(10, 24);
    const result = tt.draw(ctx);

    expect(result.length).toBeGreaterThan(1);
  });
});
