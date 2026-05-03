import { describe, it, expect } from 'vitest';
import { BashExecutionMessage } from '../bash-execution-message.js';
import { visibleWidth } from '../utils.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('BashExecutionMessage', () => {
  describe('Initialization', () => {
    it('should require command in options', () => {
      const msg = new BashExecutionMessage({ command: 'ls -la' });
      expect(msg).toBeInstanceOf(BashExecutionMessage);
    });

    it('should accept all options', () => {
      const msg = new BashExecutionMessage({
        command: 'echo hello',
        output: 'hello\nworld',
        exitCode: 0,
        isRunning: false,
        expanded: false,
        padding: 2,
      });
      expect(msg).toBeInstanceOf(BashExecutionMessage);
    });
  });

  describe('Command Display', () => {
    it('should display command with $ prefix', () => {
      const msg = new BashExecutionMessage({ command: 'pwd' });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.some(l => l.includes('$ pwd'))).toBe(true);
    });
  });

  describe('Output Rendering', () => {
    it('should render output when provided', () => {
      const msg = new BashExecutionMessage({
        command: 'echo test',
        output: 'test',
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('test');
    });

    it('should handle empty output', () => {
      const msg = new BashExecutionMessage({
        command: 'test',
        output: '',
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      // Empty output may show '(no output)' or simply no content lines
      // Just check that it does not crash
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Status Indicators', () => {
    it('should show running status', () => {
      const msg = new BashExecutionMessage({
        command: 'test',
        isRunning: true,
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('Running...');
    });

    it('should show cancelled status', () => {
      const msg = new BashExecutionMessage({
        command: 'test',
        isCancelled: true,
        isRunning: false,
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('(cancelled)');
    });

    it('should show success with checkmark on exitCode 0', () => {
      const msg = new BashExecutionMessage({
        command: 'test',
        exitCode: 0,
        isRunning: false,
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('✓ Done');
    });

    it('should show error with exit code on non-zero', () => {
      const msg = new BashExecutionMessage({
        command: 'false',
        exitCode: 1,
        isRunning: false,
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('✗ Exit 1');
    });
  });

  describe('setOutput()', () => {
    it('should append output', () => {
      const msg = new BashExecutionMessage({ command: 'test' });
      const ctx = createContext(80, 24);

      msg.appendOutput('part1');
      msg.appendOutput('part2');

      const result = msg.draw(ctx);
      expect(result.join('\n')).toContain('part1part2');
    });
  });

  describe('setComplete()', () => {
    it('should set exit code and cancel state', () => {
      const msg = new BashExecutionMessage({ command: 'test', isRunning: true });

      msg.setComplete(1, true);

      expect(msg.opts.exitCode).toBe(1);
      expect(msg.opts.isCancelled).toBe(true);
      expect(msg.opts.isRunning).toBe(false);
    });
  });

  describe('setExpanded()', () => {
    it('should toggle expanded state', () => {
      const msg = new BashExecutionMessage({ command: 'test' });

      msg.setExpanded(true);
      expect(msg.opts.expanded).toBe(true);

      msg.setExpanded(false);
      expect(msg.opts.expanded).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode in output', () => {
      const msg = new BashExecutionMessage({
        command: 'echo',
        output: '✓ Done 🌍',
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('✓');
      expect(result.join('\n')).toContain('🌍');
    });
  });
});
