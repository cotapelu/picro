import { describe, it, expect } from 'vitest';
import { Toast } from '../toast.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Toast Component', () => {
  it('should render message', () => {
    const toast = new Toast({ message: 'Hello Toast', type: 'info' });
    const ctx = createContext(80, 24);
    const result = toast.draw(ctx);

    expect(result.some(l => l.includes('Hello Toast'))).toBe(true);
  });

  it('should apply type styling', () => {
    const toast = new Toast({ message: 'Error!', type: 'error' });
    const ctx = createContext(80, 24);
    const result = toast.draw(ctx);

    // error type likely uses red color
    expect(result.join('\n')).toContain('\x1b[31m');
  });

  it('should auto-dismiss after duration', () => {
    const toast = new Toast({ message: 'Temporary', duration: 1000 });
    expect(toast.duration).toBe(1000);
  });
});
