// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { validateSettings, validateOrThrow, type SettingsValidationError } from './settings-validator.js';

type Settings = any; // simplified

describe('validateSettings', () => {
  it('returns empty array for empty settings', () => {
    const errors = validateSettings({} as Settings);
    expect(errors).toEqual([]);
  });

  it('validates defaultProvider type', () => {
    const errors = validateSettings({ defaultProvider: 123 } as Settings);
    expect(errors.some(e => e.field === 'defaultProvider' && e.message.includes('string'))).toBe(true);
  });

  it('validates defaultModel type', () => {
    const errors = validateSettings({ defaultModel: true } as Settings);
    expect(errors.some(e => e.field === 'defaultModel')).toBe(true);
  });

  it('validates steeringMode enum', () => {
    const errors = validateSettings({ steeringMode: 'invalid' } as Settings);
    expect(errors.some(e => e.field === 'steeringMode' && e.message.includes('all'))).toBe(true);
  });

  it('validates transport enum', () => {
    const errors = validateSettings({ transport: 'udp' } as Settings);
    expect(errors.some(e => e.field === 'transport')).toBe(true);
  });

  it('validates followUpMode enum', () => {
    const errors = validateSettings({ followUpMode: 'all-of-them' } as Settings);
    expect(errors.some(e => e.field === 'followUpMode')).toBe(true);
  });

  it('validates compaction.enabled boolean', () => {
    const errors = validateSettings({ compaction: { enabled: 'yes' } } as Settings);
    expect(errors.some(e => e.field === 'compaction.enabled')).toBe(true);
  });

  it('validates compaction.reserveTokens non-negative number', () => {
    const errors = validateSettings({ compaction: { reserveTokens: -1 } } as Settings);
    expect(errors.some(e => e.field === 'compaction.reserveTokens')).toBe(true);
  });

  it('validates compaction.keepRecentTokens non-negative', () => {
    const errors = validateSettings({ compaction: { keepRecentTokens: -100 } } as Settings);
    expect(errors.some(e => e.field === 'compaction.keepRecentTokens')).toBe(true);
  });

  it('validates branchSummary.reserveTokens non-negative', () => {
    const errors = validateSettings({ branchSummary: { reserveTokens: -10 } } as Settings);
    expect(errors.some(e => e.field === 'branchSummary.reserveTokens')).toBe(true);
  });

  it('validates branchSummary.skipPrompt boolean', () => {
    const errors = validateSettings({ branchSummary: { skipPrompt: 'no' } } as Settings);
    expect(errors.some(e => e.field === 'branchSummary.skipPrompt')).toBe(true);
  });

  it('validates retry.enabled boolean', () => {
    const errors = validateSettings({ retry: { enabled: 0 } } as Settings);
    expect(errors.some(e => e.field === 'retry.enabled')).toBe(true);
  });

  it('validates retry.maxRetries non-negative', () => {
    const errors = validateSettings({ retry: { maxRetries: -5 } } as Settings);
    expect(errors.some(e => e.field === 'retry.maxRetries')).toBe(true);
  });

  it('validates retry.baseDelayMs positive', () => {
    const errors = validateSettings({ retry: { baseDelayMs: 0 } } as Settings);
    expect(errors.some(e => e.field === 'retry.baseDelayMs')).toBe(true);
  });

  it('validates retry.maxDelayMs positive', () => {
    const errors = validateSettings({ retry: { maxDelayMs: -1 } } as Settings);
    expect(errors.some(e => e.field === 'retry.maxDelayMs')).toBe(true);
  });

  it('validates terminal.showImages boolean', () => {
    const errors = validateSettings({ terminal: { showImages: 'true' } } as Settings);
    expect(errors.some(e => e.field === 'terminal.showImages')).toBe(true);
  });

  it('validates terminal.imageWidthCells positive', () => {
    const errors = validateSettings({ terminal: { imageWidthCells: 0 } } as Settings);
    expect(errors.some(e => e.field === 'terminal.imageWidthCells')).toBe(true);
  });

  it('validates terminal.clearOnShrink boolean', () => {
    const errors = validateSettings({ terminal: { clearOnShrink: 1 } } as Settings);
    expect(errors.some(e => e.field === 'terminal.clearOnShrink')).toBe(true);
  });

  it('validates terminal.showTerminalProgress boolean', () => {
    const errors = validateSettings({ terminal: { showTerminalProgress: null } } as Settings);
    expect(errors.some(e => e.field === 'terminal.showTerminalProgress')).toBe(true);
  });

  it('validates images.autoResize boolean', () => {
    const errors = validateSettings({ images: { autoResize: 2 } } as Settings);
    expect(errors.some(e => e.field === 'images.autoResize')).toBe(true);
  });

  it('validates images.blockImages boolean', () => {
    const errors = validateSettings({ images: { blockImages: 'yes' } } as Settings);
    expect(errors.some(e => e.field === 'images.blockImages')).toBe(true);
  });

  it('validates defaultThinkingLevel enum', () => {
    const errors = validateSettings({ defaultThinkingLevel: 'ultra' } as Settings);
    expect(errors.some(e => e.field === 'defaultThinkingLevel')).toBe(true);
  });

  it('accepts valid defaultThinkingLevel values', () => {
    const allowed = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    allowed.forEach(val => {
      const errors = validateSettings({ defaultThinkingLevel: val } as Settings);
      expect(errors.find(e => e.field === 'defaultThinkingLevel')).toBeUndefined();
    });
  });

  it('passes all valid settings', () => {
    const settings: Settings = {
      defaultProvider: 'openai',
      defaultModel: 'gpt-4',
      steeringMode: 'all',
      transport: 'sse',
      followUpMode: 'one-at-a-time',
      compaction: { enabled: true, reserveTokens: 1000, keepRecentTokens: 500 },
      branchSummary: { reserveTokens: 2000, skipPrompt: false },
      retry: { enabled: true, maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 },
      terminal: { showImages: true, imageWidthCells: 40, clearOnShrink: false, showTerminalProgress: true },
      images: { autoResize: true, blockImages: false },
      defaultThinkingLevel: 'medium',
    };
    const errors = validateSettings(settings);
    expect(errors).toEqual([]);
  });
});

describe('validateOrThrow', () => {
  it('throws on invalid settings with combined messages', () => {
    const badSettings: Settings = {
      defaultProvider: 123,
      transport: 'udp',
    };
    expect(() => validateOrThrow(badSettings)).toThrow(/Invalid settings/);
    expect(() => validateOrThrow(badSettings)).toThrow(/defaultProvider.*transport/);
  });

  it('does not throw on valid settings', () => {
    const goodSettings: Settings = {
      defaultProvider: 'openai',
      transport: 'sse',
    };
    expect(() => validateOrThrow(goodSettings)).not.toThrow();
  });
});
