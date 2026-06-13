// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for SettingsManager.
 */

import { describe, it, expect, vi } from 'vitest';
import { SettingsManager } from './settings-manager.js';

function createManager(overrides: any = {}) {
  return SettingsManager.inMemory(overrides);
}

describe('SettingsManager branch coverage', () => {
  describe('getCompactionSettings', () => {
    it('returns defaults when compaction not specified', () => {
      const manager = createManager({});
      const settings = manager.getCompactionSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.reserveTokens).toBe(16384);
      expect(settings.keepRecentTokens).toBe(20000);
    });

    it('returns overridden values', () => {
      const manager = createManager({
        compaction: { enabled: false, reserveTokens: 5000, keepRecentTokens: 10000 },
      });
      const settings = manager.getCompactionSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.reserveTokens).toBe(5000);
      expect(settings.keepRecentTokens).toBe(10000);
    });

    it('merges partial overrides with defaults', () => {
      const manager = createManager({
        compaction: { reserveTokens: 8000 }, // only override reserveTokens
      });
      const settings = manager.getCompactionSettings();
      expect(settings.enabled).toBe(true); // default
      expect(settings.reserveTokens).toBe(8000);
      expect(settings.keepRecentTokens).toBe(20000); // default
    });
  });

  describe('getRetrySettings', () => {
    it('returns defaults when retry not specified', () => {
      const manager = createManager({});
      const settings = manager.getRetrySettings();
      expect(settings.enabled).toBe(true); // default from getRetryEnabled() maybe? Actually method: enabled = this.settings.retry?.enabled ?? true.
      expect(settings.maxRetries).toBe(3);
      expect(settings.baseDelayMs).toBe(2000);
      expect(settings.maxDelayMs).toBe(60000);
    });

    it('returns overridden values', () => {
      const manager = createManager({
        retry: { enabled: false, maxRetries: 5, baseDelayMs: 1000, maxDelayMs: 30000 },
      });
      const settings = manager.getRetrySettings();
      expect(settings.enabled).toBe(false);
      expect(settings.maxRetries).toBe(5);
      expect(settings.baseDelayMs).toBe(1000);
      expect(settings.maxDelayMs).toBe(30000);
    });

    it('merges partial overrides', () => {
      const manager = createManager({
        retry: { maxRetries: 10 },
      });
      const settings = manager.getRetrySettings();
      expect(settings.enabled).toBe(true); // default
      expect(settings.maxRetries).toBe(10);
      expect(settings.baseDelayMs).toBe(2000); // default
    });
  });

  describe('getBranchSummarySettings', () => {
    it('returns defaults when branchSummary not specified', () => {
      const manager = createManager({});
      const settings = manager.getBranchSummarySettings();
      expect(settings.reserveTokens).toBe(16384);
      expect(settings.skipPrompt).toBe(false);
    });

    it('returns overridden values', () => {
      const manager = createManager({
        branchSummary: { reserveTokens: 5000, skipPrompt: true },
      });
      const settings = manager.getBranchSummarySettings();
      expect(settings.reserveTokens).toBe(5000);
      expect(settings.skipPrompt).toBe(true);
    });
  });

  describe('Compaction settings edge cases', () => {
    it('handles compaction object without nested fields', () => {
      const manager = createManager({
        compaction: {},
      });
      const settings = manager.getCompactionSettings();
      expect(settings.enabled).toBe(true); // default fallback
      expect(settings.reserveTokens).toBe(16384);
      expect(settings.keepRecentTokens).toBe(20000);
    });
  });

  describe('Retry settings edge cases', () => {
    it('handles retry object with only enabled false', () => {
      const manager = createManager({
        retry: { enabled: false },
      });
      const settings = manager.getRetrySettings();
      expect(settings.enabled).toBe(false);
      expect(settings.maxRetries).toBe(3); // default
    });
  });

  // Test branches in set* methods
  describe('setCompactionEnabled', () => {
    it('updates the setting and persists', () => {
      const manager = createManager({});
      manager.setCompactionEnabled(false);
      expect(manager.getCompactionSettings().enabled).toBe(false);
    });
  });

  describe('setRetryEnabled', () => {
    it('updates the setting', () => {
      const manager = createManager({});
      manager.setRetryEnabled(true);
      expect(manager.getRetrySettings().enabled).toBe(true);
    });
  });
});
