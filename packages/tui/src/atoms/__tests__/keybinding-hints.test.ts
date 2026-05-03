import { describe, it, expect } from 'vitest';
import { KeybindingHints, type KeyBinding } from '../keybinding-hints.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('KeybindingHints', () => {
  it('should render key bindings', () => {
    const hints = new KeybindingHints({
      bindings: [
        { key: 'Ctrl+S', action: 'Save' },
        { key: 'Ctrl+Q', action: 'Quit' },
      ],
    });
    const ctx = createContext(80, 24);
    const result = hints.draw(ctx);

    expect(result.some(l => l.includes('Ctrl+S'))).toBe(true);
    expect(result.some(l => l.includes('Save'))).toBe(true);
    expect(result.some(l => l.includes('Ctrl+Q'))).toBe(true);
  });

  it('should update bindings', () => {
    const hints = new KeybindingHints({ bindings: [] });
    hints.setBindings([
      { key: 'Enter', action: 'Submit' },
    ]);
    const ctx = createContext(80, 24);
    const result = hints.draw(ctx);

    expect(result.join('\n')).toContain('Enter');
    expect(result.join('\n')).toContain('Submit');
  });

  it('should handle empty bindings', () => {
    const hints = new KeybindingHints({ bindings: [] });
    const ctx = createContext(80, 24);
    const result = hints.draw(ctx);

    expect(result).toEqual([]);
  });
});
