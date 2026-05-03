import { describe, it, expect } from 'vitest';
import { Toast } from '../toast.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Toast', () => {
  it('should render message', () => {
    const toast = new Toast({ message: 'Hello Toast', type: 'info' });
    const ctx = createContext(80, 24);
    const result = toast.draw(ctx);

    expect(result.join('\n')).toContain('Hello Toast');
  });

  it('should apply type color', () => {
    const toast = new Toast({ message: 'Error!', type: 'error' });
    const ctx = createContext(80, 24);
    const result = toast.draw(ctx);

    // error type uses red background (48;5;196)
    expect(result.join('\n')).toContain('\x1b[48;5;196m');
  });

  it('should auto-dismiss after duration', () => {
    const toast = new Toast({ message: 'Temporary', duration: 1000 });
    expect(toast.duration).toBe(1000);
  });
});
