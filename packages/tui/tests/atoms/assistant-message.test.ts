import { describe, it, expect } from 'vitest';
import { AssistantMessage } from '../assistant-message.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('AssistantMessage', () => {
  describe('Initialization', () => {
    it('should create with default options', () => {
      const msg = new AssistantMessage();
      expect(msg).toBeInstanceOf(AssistantMessage);
    });

    it('should create with custom options', () => {
      const msg = new AssistantMessage({
        content: 'Hello',
        isLoading: false,
        color: 'blue',
        padding: 2,
      });
      expect(msg).toBeInstanceOf(AssistantMessage);
    });
  });

  describe('Content Rendering', () => {
    it('should render markdown content', () => {
      const msg = new AssistantMessage({ content: '**Bold**' });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.some(l => l.includes('Bold'))).toBe(true);
    });

    it('should render plain text', () => {
      const msg = new AssistantMessage({ content: 'Plain text' });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.some(l => l.includes('Plain text'))).toBe(true);
    });

    it('should handle multiple lines', () => {
      const msg = new AssistantMessage({ content: 'Line1\nLine2\nLine3' });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.some(l => l.includes('Line1'))).toBe(true);
      expect(result.some(l => l.includes('Line2'))).toBe(true);
      expect(result.some(l => l.includes('Line3'))).toBe(true);
    });

    it('should handle empty content', () => {
      const msg = new AssistantMessage({ content: '' });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result).toEqual([]);
    });

    it('should handle whitespace-only content', () => {
      const msg = new AssistantMessage({ content: '   \n   ' });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result).toEqual([]);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when isLoading=true', () => {
      const msg = new AssistantMessage({ isLoading: true });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result[0]).toContain('Thinking');
    });

    it('should not show content when loading', () => {
      const msg = new AssistantMessage({
        content: 'Secret',
        isLoading: true,
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).not.toContain('Secret');
    });
  });

  describe('Padding', () => {
    it('should apply default padding (0)', () => {
      const msg = new AssistantMessage({ content: 'Test' });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      // Should contain 'Test' somewhere
      expect(result.join('\n')).toContain('Test');
    });

    it('should apply custom padding', () => {
      const msg = new AssistantMessage({ content: 'Test', padding: 2 });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      const line = result[0];
      expect(line.startsWith('  ')).toBe(true);
    });
  });

  describe('Color Styling', () => {
    it('should apply text color', () => {
      const msg = new AssistantMessage({ content: 'Red text', color: 'red' });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result[0]).toContain('\x1b[31m');
      expect(result[0]).toContain('\x1b[0m');
    });

    it('should support all basic colors', () => {
      const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
      colors.forEach(color => {
        const msg = new AssistantMessage({ content: color, color: color as any });
        const ctx = createContext(80, 24);
        const result = msg.draw(ctx);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('setContent()', () => {
    it('should update content', () => {
      const msg = new AssistantMessage({ content: 'Initial' });
      const ctx = createContext(80, 24);

      msg.setContent('Updated');
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('Updated');
    });
  });

  describe('setLoading()', () => {
    it('should toggle loading state', () => {
      const msg = new AssistantMessage({ content: 'Content' });

      msg.setLoading(true);
      expect(msg.opts.isLoading).toBe(true);

      msg.setLoading(false);
      expect(msg.opts.isLoading).toBe(false);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op but not throw', () => {
      const msg = new AssistantMessage({ content: 'Test' });
      expect(() => msg.clearCache()).not.toThrow();
    });
  });
});
