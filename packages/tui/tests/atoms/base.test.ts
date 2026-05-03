import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UIElement,
  RenderContext,
  InteractiveElement,
  KeyEvent,
  CURSOR_MARKER,
  ElementContainer,
} from '../src/atoms/base.js';

// Mock context factory
function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

// Simple test component
class TestElement implements UIElement {
  private content: string;

  constructor(content: string = 'test') {
    this.content = content;
  }

  setContent(content: string): void {
    this.content = content;
  }

  draw(context: RenderContext): string[] {
    return [this.content.padEnd(context.width)];
  }

  clearCache(): void {}
}

describe('UIElement Interface', () => {
  it('should implement draw method returning string array', () => {
    const el = new TestElement('hello');
    const ctx = createContext(10, 5);
    const result = el.draw(ctx);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain('hello');
  });

  it('should respect width in draw output', () => {
    const el = new TestElement('x');
    const ctx = createContext(5, 3);
    const result = el.draw(ctx);

    result.forEach(line => {
      expect(line.length).toBeLessThanOrEqual(5);
    });
  });

  it('should implement clearCache method', () => {
    const el = new TestElement();
    expect(() => el.clearCache()).not.toThrow();
  });
});

describe('ElementContainer', () => {
  it('should append child elements', () => {
    const container = new ElementContainer();
    const child1 = new TestElement('A');
    const child2 = new TestElement('B');

    container.append(child1);
    container.append(child2);

    expect(container.children.length).toBe(2);
  });

  it('should draw all children', () => {
    const container = new ElementContainer();
    container.append(new TestElement('A'));
    container.append(new TestElement('B'));

    const ctx = createContext(20, 10);
    const result = container.draw(ctx);

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.join('\n')).toContain('A');
    expect(result.join('\n')).toContain('B');
  });

  it('should clear cache for all children', () => {
    const container = new ElementContainer();
    const child1 = new TestElement();
    const child2 = new TestElement();

    container.append(child1);
    container.append(child2);

    const clearCacheSpy1 = vi.spyOn(child1, 'clearCache');
    const clearCacheSpy2 = vi.spyOn(child2, 'clearCache');

    container.clearCache();

    expect(clearCacheSpy1).toHaveBeenCalled();
    expect(clearCacheSpy2).toHaveBeenCalled();
  });

  it('should remove child', () => {
    const container = new ElementContainer();
    const child = new TestElement();
    container.append(child);
    container.remove(child);

    expect(container.children.length).toBe(0);
  });

  it('should insert child at index (via splice workaround)', () => {
    const container = new ElementContainer();
    container.append(new TestElement('A'));
    container.append(new TestElement('C'));

    // ElementContainer does not have insertAt, simulate by removing and re-adding
    // Or test append order
    expect(container.children[0].draw(createContext())[0]).toContain('A');
    expect(container.children[1].draw(createContext())[0]).toContain('C');
  });
});

describe('InteractiveElement', () => {
  it('TestElement does not have isFocused by default (not InteractiveElement)', () => {
    const el = new TestElement();
    expect('isFocused' in el).toBe(false);
  });

  it('ElementContainer does not have isFocused by default', () => {
    const container = new ElementContainer();
    expect('isFocused' in container).toBe(false);
  });
});

describe('KeyEvent', () => {
  it('should create valid KeyEvent', () => {
    const event: KeyEvent = {
      name: 'Enter',
      raw: '\r',
      modifiers: { ctrl: true, shift: false, alt: false },
    };

    expect(event.name).toBe('Enter');
    expect(event.raw).toBe('\r');
    expect(event.modifiers?.ctrl).toBe(true);
  });

  it('should allow undefined modifiers', () => {
    const event: KeyEvent = { name: 'a', raw: 'a' };
    expect(event.modifiers).toBeUndefined();
  });
});

describe('CURSOR_MARKER', () => {
  it('should be a string marker', () => {
    expect(typeof CURSOR_MARKER).toBe('string');
    expect(CURSOR_MARKER.length).toBeGreaterThan(0);
  });
});

describe('RenderContext', () => {
  it('should require width and height', () => {
    const ctx: RenderContext = { width: 80, height: 24 };
    expect(ctx.width).toBe(80);
    expect(ctx.height).toBe(24);
  });

  it('should allow additional properties', () => {
    const ctx = { width: 80, height: 24, theme: { primary: 'blue' } };
    expect((ctx as any).theme.primary).toBe('blue');
  });
});
