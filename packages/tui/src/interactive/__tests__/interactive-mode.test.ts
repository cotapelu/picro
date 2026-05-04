import { describe, it, expect, vi } from 'vitest';

describe('Interactive Package', () => {
  describe('module exports', () => {
    it('should export interactive-mode', async () => {
      const mod = await import('../interactive-mode');
      expect(mod.InteractiveMode).toBeDefined();
    });

    it('should export agent-bridge', async () => {
      const mod = await import('../agent-bridge');
      expect(mod.createAgentToolBridge).toBeDefined();
    });

    it('should export tui', async () => {
      const mod = await import('../tui');
      expect(mod.TerminalUI).toBeDefined();
    });
  });
});