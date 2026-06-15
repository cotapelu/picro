import { describe, it, expect, vi } from 'vitest';
import { SettingsManager } from './settings-manager.js';

function createManager(initial: Partial<any> = {}) {
  return SettingsManager.inMemory(initial);
}

describe('SettingsManager methods branch coverage', () => {
  describe('compaction', () => {
    it('getCompactionEnabled returns true when undefined (default)', () => {
      const mgr = createManager({});
      expect(mgr.getCompactionEnabled()).toBe(true);
    });

    it('getCompactionEnabled returns value when set', () => {
      const mgr = createManager({ compaction: { enabled: false } });
      expect(mgr.getCompactionEnabled()).toBe(false);
    });

    it('setCompactionEnabled creates compaction object if missing', () => {
      const mgr = createManager({});
      mgr.setCompactionEnabled(false);
      expect(mgr.getCompactionEnabled()).toBe(false);
    });

    it('setCompactionEnabled updates existing', () => {
      const mgr = createManager({ compaction: { enabled: true } });
      mgr.setCompactionEnabled(false);
      expect(mgr.getCompactionEnabled()).toBe(false);
    });

    it('getCompactionReserveTokens returns default 16384 when not set', () => {
      const mgr = createManager({});
      expect(mgr.getCompactionReserveTokens()).toBe(16384);
    });

    it('getCompactionReserveTokens returns value when set', () => {
      const mgr = createManager({ compaction: { reserveTokens: 5000 } });
      expect(mgr.getCompactionReserveTokens()).toBe(5000);
    });

    it('getCompactionKeepRecentTokens returns default 20000', () => {
      const mgr = createManager({});
      expect(mgr.getCompactionKeepRecentTokens()).toBe(20000);
    });

    it('getCompactionKeepRecentTokens returns value when set', () => {
      const mgr = createManager({ compaction: { keepRecentTokens: 1000 } });
      expect(mgr.getCompactionKeepRecentTokens()).toBe(1000);
    });
  });

  describe('retry', () => {
    it('getRetryEnabled returns true by default', () => {
      const mgr = createManager({});
      expect(mgr.getRetryEnabled()).toBe(true);
    });

    it('getRetryEnabled returns value when set', () => {
      const mgr = createManager({ retry: { enabled: false } });
      expect(mgr.getRetryEnabled()).toBe(false);
    });

    it('setRetryEnabled creates retry object if missing', () => {
      const mgr = createManager({});
      mgr.setRetryEnabled(false);
      expect(mgr.getRetryEnabled()).toBe(false);
    });

    it('setRetryEnabled updates existing', () => {
      const mgr = createManager({ retry: { enabled: true } });
      mgr.setRetryEnabled(false);
      expect(mgr.getRetryEnabled()).toBe(false);
    });
  });

  describe('terminal.imageWidthCells', () => {
    it('getImageWidthCells returns default 60 when not set', () => {
      const mgr = createManager({});
      expect(mgr.getImageWidthCells()).toBe(60);
    });

    it('getImageWidthCells returns value when set', () => {
      const mgr = createManager({ terminal: { imageWidthCells: 80 } });
      expect(mgr.getImageWidthCells()).toBe(80);
    });

    it('getImageWidthCells floors decimal values', () => {
      const mgr = createManager({ terminal: { imageWidthCells: 10.7 } });
      expect(mgr.getImageWidthCells()).toBe(10);
    });

    it('setImageWidthCells creates terminal if missing', () => {
      const mgr = createManager({});
      mgr.setImageWidthCells(90);
      expect(mgr.getImageWidthCells()).toBe(90);
    });

    it('setImageWidthCells updates existing', () => {
      const mgr = createManager({ terminal: { imageWidthCells: 40 } });
      mgr.setImageWidthCells(100);
      expect(mgr.getImageWidthCells()).toBe(100);
    });
  });

  describe('markdown codeBlockIndent', () => {
    it('getCodeBlockIndent returns default two spaces', () => {
      const mgr = createManager({});
      expect(mgr.getCodeBlockIndent()).toBe('  ');
    });

    it('getCodeBlockIndent returns value when set', () => {
      const mgr = createManager({ markdown: { codeBlockIndent: '\\t' } });
      expect(mgr.getCodeBlockIndent()).toBe('\\t');
    });
  });

  describe('doubleEscapeAction', () => {
    it('getDoubleEscapeAction returns default tree', () => {
      const mgr = createManager({});
      expect(mgr.getDoubleEscapeAction()).toBe('tree');
    });

    it('getDoubleEscapeAction returns value when set', () => {
      const mgr = createManager({ doubleEscapeAction: 'fork' });
      expect(mgr.getDoubleEscapeAction()).toBe('fork');
    });

    it('setDoubleEscapeAction updates global', () => {
      const mgr = createManager({});
      mgr.setDoubleEscapeAction('none');
      expect(mgr.getDoubleEscapeAction()).toBe('none');
    });
  });

  describe('enabledModels', () => {
    it('getEnabledModels returns undefined when not set', () => {
      const mgr = createManager({});
      expect(mgr.getEnabledModels()).toBeUndefined();
    });

    it('getEnabledModels returns array when set', () => {
      const mgr = createManager({ enabledModels: ['openai/*'] });
      expect(mgr.getEnabledModels()).toEqual(['openai/*']);
    });

    it('setEnabledModels updates global', () => {
      const mgr = createManager({});
      mgr.setEnabledModels(['anthropic/*']);
      expect(mgr.getEnabledModels()).toEqual(['anthropic/*']);
    });
  });
});
