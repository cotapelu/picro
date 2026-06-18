// SPDX-License-Identifier: Apache-2.0
/**
 * Additional branch coverage for SettingsManager methods.
 */

import { describe, it, expect } from 'vitest';
import { SettingsManager } from './settings-manager.js';

function createManager(initial: Partial<any> = {}) {
  return SettingsManager.inMemory(initial);
}

describe('SettingsManager missing branches', () => {
  describe('terminal.showTerminalProgress', () => {
    it('getShowTerminalProgress returns false by default', () => {
      const mgr = createManager({});
      expect(mgr.getShowTerminalProgress()).toBe(false);
    });

    it('getShowTerminalProgress returns value when set', () => {
      const mgr = createManager({ terminal: { showTerminalProgress: true } });
      expect(mgr.getShowTerminalProgress()).toBe(true);
    });

    it('setShowTerminalProgress creates terminal if missing', () => {
      const mgr = createManager({});
      mgr.setShowTerminalProgress(true);
      expect(mgr.getShowTerminalProgress()).toBe(true);
    });
  });

  describe('clearOnShrink', () => {
    it('getClearOnShrink returns true by default', () => {
      const mgr = createManager({});
      expect(mgr.getClearOnShrink()).toBe(true);
    });

    it('setClearOnShrink updates value', () => {
      const mgr = createManager({});
      mgr.setClearOnShrink(false);
      expect(mgr.getClearOnShrink()).toBe(false);
    });
  });

  describe('editorPaddingX', () => {
    it('getEditorPaddingX returns 1 by default', () => {
      const mgr = createManager({});
      expect(mgr.getEditorPaddingX()).toBe(1);
    });

    it('setEditorPaddingX updates value', () => {
      const mgr = createManager({});
      mgr.setEditorPaddingX(4);
      expect(mgr.getEditorPaddingX()).toBe(4);
    });
  });

  describe('autocompleteMaxVisible', () => {
    it('getAutocompleteMaxVisible returns 10 by default', () => {
      const mgr = createManager({});
      expect(mgr.getAutocompleteMaxVisible()).toBe(10);
    });

    it('setAutocompleteMaxVisible updates value', () => {
      const mgr = createManager({});
      mgr.setAutocompleteMaxVisible(15);
      expect(mgr.getAutocompleteMaxVisible()).toBe(15);
    });
  });

  describe('autocompleteProvider', () => {
    it('getAutocompleteProvider returns undefined by default', () => {
      const mgr = createManager({});
      expect(mgr.getAutocompleteProvider()).toBeUndefined();
    });

    it('setAutocompleteProvider updates value', () => {
      const mgr = createManager({});
      mgr.setAutocompleteProvider('custom');
      expect(mgr.getAutocompleteProvider()).toBe('custom');
    });
  });

  describe('autocompleteSource', () => {
    it('getAutocompleteSource returns undefined by default', () => {
      const mgr = createManager({});
      expect(mgr.getAutocompleteSource()).toBeUndefined();
    });

    it('setAutocompleteSource updates value', () => {
      const mgr = createManager({});
      mgr.setAutocompleteSource('npm');
      expect(mgr.getAutocompleteSource()).toBe('npm');
    });
  });
});
