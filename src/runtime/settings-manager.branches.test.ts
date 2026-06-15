import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SettingsManager } from './settings-manager.js';

function createManager(initial: Partial<any> = {}) {
  return SettingsManager.inMemory(initial);
}

describe('SettingsManager branch coverage', () => {
  describe('getSteeringMode and setSteeringMode', () => {
    it('returns default one-at-a-time when not set', () => {
      const mgr = createManager({});
      expect(mgr.getSteeringMode()).toBe('one-at-a-time');
    });

    it('returns value when set to all', () => {
      const mgr = createManager({ steeringMode: 'all' });
      expect(mgr.getSteeringMode()).toBe('all');
    });

    it('setSteeringMode updates global and persists', () => {
      const mgr = createManager();
      mgr.setSteeringMode('all');
      expect(mgr.getSteeringMode()).toBe('all');
    });
  });

  describe('getFollowUpMode and setFollowUpMode', () => {
    it('returns default one-at-a-time when not set', () => {
      const mgr = createManager({});
      expect(mgr.getFollowUpMode()).toBe('one-at-a-time');
    });

    it('returns value when set to all', () => {
      const mgr = createManager({ followUpMode: 'all' });
      expect(mgr.getFollowUpMode()).toBe('all');
    });

    it('setFollowUpMode updates global', () => {
      const mgr = createManager();
      mgr.setFollowUpMode('all');
      expect(mgr.getFollowUpMode()).toBe('all');
    });
  });

  describe('getDefaultProvider and setDefaultProvider', () => {
    it('returns undefined when not set', () => {
      const mgr = createManager({});
      expect(mgr.getDefaultProvider()).toBeUndefined();
    });

    it('returns value when set', () => {
      const mgr = createManager({ defaultProvider: 'openai' });
      expect(mgr.getDefaultProvider()).toBe('openai');
    });

    it('setDefaultProvider marks modified and persists', () => {
      const mgr = createManager();
      mgr.setDefaultProvider('anthropic');
      expect(mgr.getDefaultProvider()).toBe('anthropic');
    });
  });

  describe('getTheme and setTheme', () => {
    it('returns undefined when not set', () => {
      const mgr = createManager({});
      expect(mgr.getTheme()).toBeUndefined();
    });

    it('returns value when set', () => {
      const mgr = createManager({ theme: 'dark' });
      expect(mgr.getTheme()).toBe('dark');
    });

    it('setTheme updates global', () => {
      const mgr = createManager();
      mgr.setTheme('light');
      expect(mgr.getTheme()).toBe('light');
    });
  });

  describe('getDefaultThinkingLevel and setDefaultThinkingLevel', () => {
    it('returns undefined when not set', () => {
      const mgr = createManager({});
      expect(mgr.getDefaultThinkingLevel()).toBeUndefined();
    });

    it('returns value when set to high', () => {
      const mgr = createManager({ defaultThinkingLevel: 'high' });
      expect(mgr.getDefaultThinkingLevel()).toBe('high');
    });

    it('setDefaultThinkingLevel accepts xhigh', () => {
      const mgr = createManager();
      mgr.setDefaultThinkingLevel('xhigh');
      expect(mgr.getDefaultThinkingLevel()).toBe('xhigh');
    });

    it('setDefaultThinkingLevel accepts minimal', () => {
      const mgr = createManager();
      mgr.setDefaultThinkingLevel('minimal');
      expect(mgr.getDefaultThinkingLevel()).toBe('minimal');
    });
  });

  describe('getTransport and setTransport', () => {
    it('returns sse by default', () => {
      const mgr = createManager({});
      expect(mgr.getTransport()).toBe('sse');
    });

    it('returns overridden value', () => {
      const mgr = createManager({ transport: 'websocket' });
      expect(mgr.getTransport()).toBe('websocket');
    });

    it('setTransport updates global', () => {
      const mgr = createManager();
      mgr.setTransport('polling');
      expect(mgr.getTransport()).toBe('polling');
    });
  });

  describe('Compaction settings', () => {
    describe('getCompactionEnabled', () => {
      it('returns true by default', () => {
        const mgr = createManager({});
        expect(mgr.getCompactionEnabled()).toBe(true);
      });

      it('returns false when explicitly disabled', () => {
        const mgr = createManager({ compaction: { enabled: false } });
        expect(mgr.getCompactionEnabled()).toBe(false);
      });

      it('returns true when only other compaction fields set', () => {
        const mgr = createManager({ compaction: { reserveTokens: 100 } });
        expect(mgr.getCompactionEnabled()).toBe(true);
      });
    });

    describe('setCompactionEnabled', () => {
      it('creates compaction object if missing', () => {
        const mgr = createManager({});
        mgr.setCompactionEnabled(false);
        expect(mgr.getCompactionEnabled()).toBe(false);
      });

      it('updates existing compaction.enabled', () => {
        const mgr = createManager({ compaction: { enabled: true, reserveTokens: 100 } });
        mgr.setCompactionEnabled(false);
        expect(mgr.getCompactionEnabled()).toBe(false);
        // other field preserved?
        expect(mgr.getCompactionReserveTokens()).toBe(100);
      });
    });

    describe('getCompactionReserveTokens', () => {
      it('returns default 16384 when not set', () => {
        const mgr = createManager({});
        expect(mgr.getCompactionReserveTokens()).toBe(16384);
      });

      it('returns overridden value', () => {
        const mgr = createManager({ compaction: { reserveTokens: 5000 } });
        expect(mgr.getCompactionReserveTokens()).toBe(5000);
      });
    });

    describe('getCompactionKeepRecentTokens', () => {
      it('returns default 20000 when not set', () => {
        const mgr = createManager({});
        expect(mgr.getCompactionKeepRecentTokens()).toBe(20000);
      });

      it('returns overridden value', () => {
        const mgr = createManager({ compaction: { keepRecentTokens: 10000 } });
        expect(mgr.getCompactionKeepRecentTokens()).toBe(10000);
      });
    });

    describe('getCompactionSettings', () => {
      it('returns aggregated settings with defaults', () => {
        const mgr = createManager({});
        const settings = mgr.getCompactionSettings();
        expect(settings.enabled).toBe(true);
        expect(settings.reserveTokens).toBe(16384);
        expect(settings.keepRecentTokens).toBe(20000);
      });

      it('returns overridden values', () => {
        const mgr = createManager({ compaction: { enabled: false, reserveTokens: 8000, keepRecentTokens: 12000 } });
        const settings = mgr.getCompactionSettings();
        expect(settings.enabled).toBe(false);
        expect(settings.reserveTokens).toBe(8000);
        expect(settings.keepRecentTokens).toBe(12000);
      });
    });
  });

  describe('BranchSummary settings', () => {
    describe('getBranchSummarySettings', () => {
      it('returns defaults when not set', () => {
        const mgr = createManager({});
        const settings = mgr.getBranchSummarySettings();
        expect(settings.reserveTokens).toBe(16384);
        expect(settings.skipPrompt).toBe(false);
      });

      it('returns overridden values', () => {
        const mgr = createManager({ branchSummary: { reserveTokens: 5000, skipPrompt: true } });
        const settings = mgr.getBranchSummarySettings();
        expect(settings.reserveTokens).toBe(5000);
        expect(settings.skipPrompt).toBe(true);
      });
    });
  });

  describe('Retry settings', () => {
    describe('getRetryEnabled', () => {
      it('returns true by default', () => {
        const mgr = createManager({});
        expect(mgr.getRetryEnabled()).toBe(true);
      });

      it('returns false when disabled', () => {
        const mgr = createManager({ retry: { enabled: false } });
        expect(mgr.getRetryEnabled()).toBe(false);
      });
    });

    describe('setRetryEnabled', () => {
      it('creates retry object if missing', () => {
        const mgr = createManager({});
        mgr.setRetryEnabled(false);
        expect(mgr.getRetryEnabled()).toBe(false);
      });

      it('updates existing retry.enabled', () => {
        const mgr = createManager({ retry: { enabled: true, maxRetries: 5 } });
        mgr.setRetryEnabled(false);
        expect(mgr.getRetryEnabled()).toBe(false);
      });
    });

    describe('getRetrySettings', () => {
      it('returns defaults when not set', () => {
        const mgr = createManager({});
        const s = mgr.getRetrySettings();
        expect(s.enabled).toBe(true);
        expect(s.maxRetries).toBe(3);
        expect(s.baseDelayMs).toBe(2000);
        expect(s.maxDelayMs).toBe(60000);
      });

      it('returns overridden values', () => {
        const mgr = createManager({ retry: { enabled: false, maxRetries: 10, baseDelayMs: 1000, maxDelayMs: 30000 } });
        const s = mgr.getRetrySettings();
        expect(s.enabled).toBe(false);
        expect(s.maxRetries).toBe(10);
        expect(s.baseDelayMs).toBe(1000);
        expect(s.maxDelayMs).toBe(30000);
      });
    });
  });

  describe('getHideThinkingBlock and setHideThinkingBlock', () => {
    it('returns false by default', () => {
      const mgr = createManager({});
      expect(mgr.getHideThinkingBlock()).toBe(false);
    });

    it('returns true when set', () => {
      const mgr = createManager({ hideThinkingBlock: true });
      expect(mgr.getHideThinkingBlock()).toBe(true);
    });

    it('setHideThinkingBlock updates global', () => {
      const mgr = createManager();
      mgr.setHideThinkingBlock(true);
      expect(mgr.getHideThinkingBlock()).toBe(true);
    });
  });

  describe('getShellPath and setShellPath', () => {
    it('returns undefined by default', () => {
      const mgr = createManager({});
      expect(mgr.getShellPath()).toBeUndefined();
    });

    it('returns value when set', () => {
      const mgr = createManager({ shellPath: '/bin/bash' });
      expect(mgr.getShellPath()).toBe('/bin/bash');
    });

    it('setShellPath updates global', () => {
      const mgr = createManager();
      mgr.setShellPath('/bin/zsh');
      expect(mgr.getShellPath()).toBe('/bin/zsh');
    });

    it('setShellPath accepts undefined to clear', () => {
      const mgr = createManager({ shellPath: '/bin/bash' });
      mgr.setShellPath(undefined);
      expect(mgr.getShellPath()).toBeUndefined();
    });
  });

  describe('getQuietStartup and setQuietStartup', () => {
    it('returns false by default', () => {
      const mgr = createManager({});
      expect(mgr.getQuietStartup()).toBe(false);
    });

    it('returns true when set', () => {
      const mgr = createManager({ quietStartup: true });
      expect(mgr.getQuietStartup()).toBe(true);
    });

    it('setQuietStartup updates global', () => {
      const mgr = createManager();
      mgr.setQuietStartup(true);
      expect(mgr.getQuietStartup()).toBe(true);
    });
  });

  describe('getShellCommandPrefix and setShellCommandPrefix', () => {
    it('returns undefined by default', () => {
      const mgr = createManager({});
      expect(mgr.getShellCommandPrefix()).toBeUndefined();
    });

    it('returns value when set', () => {
      const mgr = createManager({ shellCommandPrefix: 'eval ' });
      expect(mgr.getShellCommandPrefix()).toBe('eval ');
    });

    it('setShellCommandPrefix updates global', () => {
      const mgr = createManager();
      mgr.setShellCommandPrefix('prefix');
      expect(mgr.getShellCommandPrefix()).toBe('prefix');
    });
  });

  describe('getEnableInstallTelemetry and setEnableInstallTelemetry', () => {
    it('returns true by default', () => {
      const mgr = createManager({});
      expect(mgr.getEnableInstallTelemetry()).toBe(true);
    });

    it('returns false when disabled', () => {
      const mgr = createManager({ enableInstallTelemetry: false });
      expect(mgr.getEnableInstallTelemetry()).toBe(false);
    });

    it('setEnableInstallTelemetry updates global', () => {
      const mgr = createManager();
      mgr.setEnableInstallTelemetry(false);
      expect(mgr.getEnableInstallTelemetry()).toBe(false);
    });
  });

  describe('getPackages and setPackages', () => {
    it('returns empty array by default', () => {
      const mgr = createManager({});
      expect(mgr.getPackages()).toEqual([]);
    });

    it('returns copy of packages array', () => {
      const mgr = createManager({ packages: ['a', 'b'] });
      expect(mgr.getPackages()).toEqual(['a', 'b']);
    });

    it('setPackages updates global', () => {
      const mgr = createManager();
      mgr.setPackages(['x', 'y']);
      expect(mgr.getPackages()).toEqual(['x', 'y']);
    });

    it('setPackages returns a copy (immutable)', () => {
      const mgr = createManager();
      mgr.setPackages(['a']);
      const p = mgr.getPackages();
      p.push('b'); // mutate copy
      expect(mgr.getPackages()).toEqual(['a']); // original unchanged
    });
  });

  describe('getExtensionPaths and setExtensionPaths', () => {
    it('returns empty array by default', () => {
      const mgr = createManager({});
      expect(mgr.getExtensionPaths()).toEqual([]);
    });

    it('setExtensionPaths updates global', () => {
      const mgr = createManager();
      mgr.setExtensionPaths(['/ext1', '/ext2']);
      expect(mgr.getExtensionPaths()).toEqual(['/ext1', '/ext2']);
    });
  });

  describe('getSkillPaths and setSkillPaths', () => {
    it('returns empty array by default', () => {
      const mgr = createManager({});
      expect(mgr.getSkillPaths()).toEqual([]);
    });

    it('setSkillPaths updates global', () => {
      const mgr = createManager();
      mgr.setSkillPaths(['/skill1']);
      expect(mgr.getSkillPaths()).toEqual(['/skill1']);
    });
  });

  describe('getEnableSkillCommands and setEnableSkillCommands', () => {
    it('returns true by default', () => {
      const mgr = createManager({});
      expect(mgr.getEnableSkillCommands()).toBe(true);
    });

    it('returns false when disabled', () => {
      const mgr = createManager({ enableSkillCommands: false });
      expect(mgr.getEnableSkillCommands()).toBe(false);
    });

    it('setEnableSkillCommands updates global', () => {
      const mgr = createManager();
      mgr.setEnableSkillCommands(false);
      expect(mgr.getEnableSkillCommands()).toBe(false);
    });
  });

  describe('Terminal settings', () => {
    describe('getShowImages', () => {
      it('returns true by default', () => {
        const mgr = createManager({});
        expect(mgr.getShowImages()).toBe(true);
      });

      it('returns false when disabled', () => {
        const mgr = createManager({ terminal: { showImages: false } });
        expect(mgr.getShowImages()).toBe(false);
      });
    });

    describe('setShowImages', () => {
      it('creates terminal object if missing', () => {
        const mgr = createManager({});
        mgr.setShowImages(false);
        expect(mgr.getShowImages()).toBe(false);
      });

      it('updates existing terminal.showImages', () => {
        const mgr = createManager({ terminal: { showImages: true, imageWidthCells: 80 } });
        mgr.setShowImages(false);
        expect(mgr.getShowImages()).toBe(false);
        expect(mgr.getImageWidthCells()).toBe(80);
      });
    });

    describe('getImageWidthCells', () => {
      it('returns default 60 when not set', () => {
        const mgr = createManager({});
        expect(mgr.getImageWidthCells()).toBe(60);
      });

      it('returns clamped value when set', () => {
        const mgr = createManager({ terminal: { imageWidthCells: 100 } });
        expect(mgr.getImageWidthCells()).toBe(100);
      });



      it('floor decimal values', () => {
        const mgr = createManager({ terminal: { imageWidthCells: 10.7 } });
        expect(mgr.getImageWidthCells()).toBe(10);
      });
    });

    describe('setImageWidthCells', () => {
      it('creates terminal object if missing', () => {
        const mgr = createManager({});
        mgr.setImageWidthCells(80);
        expect(mgr.getImageWidthCells()).toBe(80);
      });

      it('clamps to minimum 1', () => {
        const mgr = createManager({});
        mgr.setImageWidthCells(0);
        expect(mgr.getImageWidthCells()).toBe(1);
      });

      it('floors decimal values', () => {
        const mgr = createManager({});
        mgr.setImageWidthCells(12.9);
        expect(mgr.getImageWidthCells()).toBe(12);
      });
    });
  });

  describe('getEnabledModels and setEnabledModels', () => {
    it('returns undefined when not set', () => {
      const mgr = createManager({});
      expect(mgr.getEnabledModels()).toBeUndefined();
    });

    it('returns array when set', () => {
      const mgr = createManager({ enabledModels: ['gpt-4', 'claude-3'] });
      expect(mgr.getEnabledModels()).toEqual(['gpt-4', 'claude-3']);
    });

    it('setEnabledModels updates global and returns copy', () => {
      const mgr = createManager();
      mgr.setEnabledModels(['model1']);
      expect(mgr.getEnabledModels()).toEqual(['model1']);
    });
  });

  describe('getDoubleEscapeAction and setDoubleEscapeAction', () => {
    it('returns tree by default', () => {
      const mgr = createManager({});
      expect(mgr.getDoubleEscapeAction()).toBe('tree');
    });

    it('returns fork when set', () => {
      const mgr = createManager({ doubleEscapeAction: 'fork' });
      expect(mgr.getDoubleEscapeAction()).toBe('fork');
    });

    it('setDoubleEscapeAction updates global', () => {
      const mgr = createManager();
      mgr.setDoubleEscapeAction('none');
      expect(mgr.getDoubleEscapeAction()).toBe('none');
    });
  });

  describe('getCodeBlockIndent', () => {
    it('returns two spaces by default', () => {
      const mgr = createManager({});
      expect(mgr.getCodeBlockIndent()).toBe('  ');
    });

    it('returns overridden value', () => {
      const mgr = createManager({ markdown: { codeBlockIndent: '\t' } });
      expect(mgr.getCodeBlockIndent()).toBe('\t');
    });
  });

  describe('Session directory handling', () => {
    it('getSessionDir returns undefined when not set', () => {
      const mgr = createManager({});
      expect(mgr.getSessionDir()).toBeUndefined();
    });

    it('getSessionDir expands ~ to homedir', () => {
      const mgr = createManager({ sessionDir: '~' });
      const result = mgr.getSessionDir();
      expect(result).not.toBe('~');
      expect(result).toContain('/'); // contains path separator
    });

    it('getSessionDir expands ~/path', () => {
      const mgr = createManager({ sessionDir: '~/sessions' });
      const result = mgr.getSessionDir();
      expect(result).not.toBe('~/sessions');
      expect(result.endsWith('/sessions')).toBe(true);
    });

    it('getSessionDir returns absolute path as-is', () => {
      const mgr = createManager({ sessionDir: '/absolute/path' });
      expect(mgr.getSessionDir()).toBe('/absolute/path');
    });
  });

  describe('Advanced nested settings access', () => {
    it('getSessionDir handles ~ correctly', () => {
      const mgr = createManager({ sessionDir: '~/test' });
      const dir = mgr.getSessionDir();
      expect(dir).not.toBe('~/test');
    });
  });
});
