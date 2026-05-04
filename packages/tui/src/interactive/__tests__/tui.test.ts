import { describe, it, expect } from 'vitest';

describe('TerminalUI', () => {
  describe('exports', () => {
    it('should export TerminalUI class', async () => {
      const { TerminalUI } = await import('../tui');
      expect(TerminalUI).toBeDefined();
    });

    it('should be a class', async () => {
      const { TerminalUI } = await import('../tui');
      expect(typeof TerminalUI).toBe('function');
    });
  });
});