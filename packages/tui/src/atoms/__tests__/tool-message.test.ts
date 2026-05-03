import { describe, it, expect } from 'vitest';
import { ToolMessage } from '../tool-message.js';
import { visibleWidth } from '../utils.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('ToolMessage', () => {
  describe('Initialization', () => {
    it('should require toolName', () => {
      const msg = new ToolMessage({ toolName: 'search' });
      expect(msg).toBeInstanceOf(ToolMessage);
    });

    it('should accept all options', () => {
      const msg = new ToolMessage({
        toolName: 'fetch',
        output: 'result',
        error: false,
        duration: 1234,
        padding: 2,
      });
      expect(msg).toBeInstanceOf(ToolMessage);
    });
  });

  describe('Header Display', () => {
    it('should show tool name in brackets', () => {
      const msg = new ToolMessage({ toolName: 'grep' });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result[0]).toContain('[grep]');
    });

    it('should show duration if provided', () => {
      const msg = new ToolMessage({ toolName: 'calc', duration: 500 });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result[0]).toContain('500ms');
    });
  });

  describe('Output Rendering', () => {
    it('should render output', () => {
      const msg = new ToolMessage({
        toolName: 'echo',
        output: 'Hello World',
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('Hello World');
    });

    it('should handle empty output', () => {
      const msg = new ToolMessage({ toolName: 'test' });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.some(l => l.includes('(no output)'))).toBe(true);
    });
  });

  describe('setResult()', () => {
    it('should set output and duration', () => {
      const msg = new ToolMessage({ toolName: 'test' });

      msg.setResult('output data', 1000);

      expect(msg.opts.output).toBe('output data');
      expect(msg.opts.duration).toBe(1000);
      expect(msg.opts.error).toBe(false);
    });
  });

  describe('setError()', () => {
    it('should set error flag and output', () => {
      const msg = new ToolMessage({ toolName: 'test' });

      msg.setError('Something broke');

      expect(msg.opts.output).toBe('Something broke');
      expect(msg.opts.error).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode in output', () => {
      const msg = new ToolMessage({
        toolName: 'unicode',
        output: '✓ Done 🌍 你好',
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('✓');
      expect(result.join('\n')).toContain('🌍');
      expect(result.join('\n')).toContain('你好');
    });
  });
});
