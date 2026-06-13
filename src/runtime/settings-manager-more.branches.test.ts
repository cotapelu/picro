// SPDX-License-Identifier: Apache-2.0
/**
 * Additional branch coverage tests for SettingsManager getters.
 * Covers many simple getters with default and overridden values.
 */

import { describe, it, expect } from 'vitest';
import { SettingsManager } from './settings-manager.js';

function createManager(overrides: any = {}) {
  return SettingsManager.inMemory(overrides);
}

describe('SettingsManager getters branch coverage', () => {
  describe('getSteeringMode', () => {
    it('returns default "one-at-a-time" when not set', () => {
      const manager = createManager({});
      expect(manager.getSteeringMode()).toBe('one-at-a-time');
    });

    it('returns overridden "all"', () => {
      const manager = createManager({ steeringMode: 'all' });
      expect(manager.getSteeringMode()).toBe('all');
    });
  });

  describe('getFollowUpMode', () => {
    it('returns default "one-at-a-time" when not set', () => {
      const manager = createManager({});
      expect(manager.getFollowUpMode()).toBe('one-at-a-time');
    });

    it('returns overridden "all"', () => {
      const manager = createManager({ followUpMode: 'all' });
      expect(manager.getFollowUpMode()).toBe('all');
    });
  });

  describe('getTheme', () => {
    it('returns undefined when not set', () => {
      const manager = createManager({});
      expect(manager.getTheme()).toBeUndefined();
    });

    it('returns overridden theme', () => {
      const manager = createManager({ theme: 'dark' });
      expect(manager.getTheme()).toBe('dark');
    });
  });

  describe('getDefaultThinkingLevel', () => {
    it('returns undefined when not set', () => {
      const manager = createManager({});
      expect(manager.getDefaultThinkingLevel()).toBeUndefined();
    });

    it('returns overridden level', () => {
      const manager = createManager({ defaultThinkingLevel: 'low' });
      expect(manager.getDefaultThinkingLevel()).toBe('low');
    });
  });

  describe('getTransport', () => {
    it('returns default "sse" when not set', () => {
      const manager = createManager({});
      expect(manager.getTransport()).toBe('sse');
    });

    it('returns overridden transport', () => {
      const manager = createManager({ transport: 'websocket' });
      expect(manager.getTransport()).toBe('websocket');
    });
  });

  describe('getHideThinkingBlock', () => {
    it('returns false when not set', () => {
      const manager = createManager({});
      expect(manager.getHideThinkingBlock()).toBe(false);
    });

    it('returns true when overridden', () => {
      const manager = createManager({ hideThinkingBlock: true });
      expect(manager.getHideThinkingBlock()).toBe(true);
    });
  });

  describe('getShellPath', () => {
    it('returns undefined when not set', () => {
      const manager = createManager({});
      expect(manager.getShellPath()).toBeUndefined();
    });

    it('returns overridden shell path', () => {
      const manager = createManager({ shellPath: '/bin/bash' });
      expect(manager.getShellPath()).toBe('/bin/bash');
    });
  });

  describe('getQuietStartup', () => {
    it('returns false when not set', () => {
      const manager = createManager({});
      expect(manager.getQuietStartup()).toBe(false);
    });

    it('returns true when overridden', () => {
      const manager = createManager({ quietStartup: true });
      expect(manager.getQuietStartup()).toBe(true);
    });
  });

  describe('getShellCommandPrefix', () => {
    it('returns undefined when not set', () => {
      const manager = createManager({});
      expect(manager.getShellCommandPrefix()).toBeUndefined();
    });

    it('returns overridden prefix', () => {
      const manager = createManager({ shellCommandPrefix: 'sudo' });
      expect(manager.getShellCommandPrefix()).toBe('sudo');
    });
  });

  describe('getEnableInstallTelemetry', () => {
    it('returns true by default', () => {
      const manager = createManager({});
      expect(manager.getEnableInstallTelemetry()).toBe(true);
    });

    it('returns false when overridden', () => {
      const manager = createManager({ enableInstallTelemetry: false });
      expect(manager.getEnableInstallTelemetry()).toBe(false);
    });
  });

  describe('getPackages', () => {
    it('returns empty array when not set', () => {
      const manager = createManager({});
      expect(manager.getPackages()).toEqual([]);
    });

    it('returns overridden packages', () => {
      const manager = createManager({ packages: [{ name: 'foo', source: 'npm' }] });
      expect(manager.getPackages()).toHaveLength(1);
      expect(manager.getPackages()[0].name).toBe('foo');
    });
  });

  describe('getExtensionPaths', () => {
    it('returns empty array when not set', () => {
      const manager = createManager({});
      expect(manager.getExtensionPaths()).toEqual([]);
    });

    it('returns overridden paths', () => {
      const manager = createManager({ extensions: ['/ext1', '/ext2'] });
      expect(manager.getExtensionPaths()).toEqual(['/ext1', '/ext2']);
    });
  });

  describe('getSkillPaths', () => {
    it('returns empty array when not set', () => {
      const manager = createManager({});
      expect(manager.getSkillPaths()).toEqual([]);
    });

    it('returns overridden paths', () => {
      const manager = createManager({ skills: ['/skills/a'] });
      expect(manager.getSkillPaths()).toEqual(['/skills/a']);
    });
  });

  describe('getEnableSkillCommands', () => {
    it('returns true by default', () => {
      const manager = createManager({});
      expect(manager.getEnableSkillCommands()).toBe(true);
    });

    it('returns false when overridden', () => {
      const manager = createManager({ enableSkillCommands: false });
      expect(manager.getEnableSkillCommands()).toBe(false);
    });
  });

  describe('getShowImages', () => {
    it('returns true by default', () => {
      const manager = createManager({});
      expect(manager.getShowImages()).toBe(true);
    });

    it('returns false when overridden via terminal.showImages', () => {
      const manager = createManager({ terminal: { showImages: false } });
      expect(manager.getShowImages()).toBe(false);
    });
  });

  describe('getImageWidthCells', () => {
    it('returns 60 by default', () => {
      const manager = createManager({});
      expect(manager.getImageWidthCells()).toBe(60);
    });

    it('returns overridden width via terminal.imageWidthCells', () => {
      const manager = createManager({ terminal: { imageWidthCells: 120 } });
      expect(manager.getImageWidthCells()).toBe(120);
    });
  });

  describe('getEnabledModels', () => {
    it('returns undefined when not set', () => {
      const manager = createManager({});
      expect(manager.getEnabledModels()).toBeUndefined();
    });

    it('returns overridden list', () => {
      const manager = createManager({ enabledModels: ['gpt-4', 'claude-3'] });
      expect(manager.getEnabledModels()).toEqual(['gpt-4', 'claude-3']);
    });
  });

  describe('getDoubleEscapeAction', () => {
    it('returns "tree" by default', () => {
      const manager = createManager({});
      expect(manager.getDoubleEscapeAction()).toBe('tree');
    });

    it('returns overridden action', () => {
      const manager = createManager({ doubleEscapeAction: 'fork' });
      expect(manager.getDoubleEscapeAction()).toBe('fork');
    });
  });

  describe('getThinkingBudgets', () => {
    it('returns undefined when not set', () => {
      const manager = createManager({});
      expect(manager.getThinkingBudgets()).toBeUndefined();
    });

    it('returns overridden budgets object', () => {
      const manager = createManager({ thinkingBudgets: { minimal: 1000, medium: 4000 } });
      expect(manager.getThinkingBudgets()).toEqual({ minimal: 1000, medium: 4000 });
    });
  });

  describe('getCodeBlockIndent', () => {
    it('returns two spaces by default', () => {
      const manager = createManager({});
      expect(manager.getCodeBlockIndent()).toBe('  ');
    });

    it('returns overridden indent via markdown.codeBlockIndent', () => {
      const manager = createManager({ markdown: { codeBlockIndent: '\t' } });
      expect(manager.getCodeBlockIndent()).toBe('\t');
    });
  });
});
