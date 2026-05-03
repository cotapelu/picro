import { describe, it, expect } from 'vitest';
import { KeybindingHints } from '../keybinding-hints.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('KeybindingHints Component', () => {
  it('should render key hints', () => {
    const hints = new KeybindingHints([
      { key: 'Ctrl+S', description: 'Save' },
      { key: 'Ctrl+Q', description: 'Quit' },
    ]);
    const ctx = createContext(80, 24);
    const result = hints.draw(ctx);

    expect(result.join('\n')).toContain('Ctrl+S');
    expect(result.join('\n')).toContain('Save');
    expect(result.join('\n')).toContain('Ctrl+Q');
  });

  it('should handle single hint', () => {
    const hints = new KeybindingHints([{ key: 'Enter', description: 'Submit' }]);
    const ctx = createContext(80, 24);
    const result = hints.draw(ctx);

    expect(result.join('\n')).toContain('Enter');
    expect(result.join('\n')).toContain('Submit');
  });

  it('should handle empty hints', () => {
    const hints = new KeybindingHints([]);
    const ctx = createContext(80, 24);
    const result = hints.draw(ctx);

    expect(result).toEqual([]);
  });
});
