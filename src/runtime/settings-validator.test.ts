import { describe, it, expect } from 'vitest';
import { validateSettings, validateOrThrow, type SettingsValidationError } from './settings-validator.js';
import type { Settings } from './settings-manager.js';

function assertErrors(settings: Settings, expectedFields: string[]) {
  const errors = validateSettings(settings);
  expect(errors.map(e => e.field)).toEqual(expectedFields);
  expect(errors.every(e => !!e.message)).toBe(true);
}

describe('validateSettings', () => {
  it('accepts empty settings (valid)', () => {
    const errors = validateSettings({} as Settings);
    expect(errors).toEqual([]);
  });

  it('rejects invalid defaultProvider type', () => {
    const settings: Settings = { defaultProvider: 123 as any };
    assertErrors(settings, ['defaultProvider']);
  });

  it('rejects invalid defaultModel type', () => {
    const settings: Settings = { defaultModel: false as any };
    assertErrors(settings, ['defaultModel']);
  });

  it('rejects invalid steeringMode value', () => {
    const settings: Settings = { steeringMode: 'fast' as any };
    assertErrors(settings, ['steeringMode']);
  });

  it('accepts valid steeringMode values', () => {
    ['all', 'one-at-a-time'].forEach(mode => {
      const settings: Settings = { steeringMode: mode };
      expect(validateSettings(settings)).toEqual([]);
    });
  });

  it('rejects invalid transport value', () => {
    const settings: Settings = { transport: 'udp' as any };
    assertErrors(settings, ['transport']);
  });

  it('accepts valid transport values', () => {
    ['sse', 'websocket', 'polling'].forEach(t => {
      const settings: Settings = { transport: t };
      expect(validateSettings(settings)).toEqual([]);
    });
  });

  it('rejects invalid followUpMode value', () => {
    const settings: Settings = { followUpMode: 'many' as any };
    assertErrors(settings, ['followUpMode']);
  });

  it('rejects compaction.enabled non-boolean', () => {
    const settings: Settings = { compaction: { enabled: 'yes' as any } };
    assertErrors(settings, ['compaction.enabled']);
  });

  it('rejects compaction.reserveTokens negative', () => {
    const settings: Settings = { compaction: { reserveTokens: -1 } };
    assertErrors(settings, ['compaction.reserveTokens']);
  });

  it('rejects compaction.keepRecentTokens negative', () => {
    const settings: Settings = { compaction: { keepRecentTokens: -10 } };
    assertErrors(settings, ['compaction.keepRecentTokens']);
  });

  it('accepts valid compaction settings', () => {
    const settings: Settings = { compaction: { enabled: true, reserveTokens: 1000, keepRecentTokens: 500 } };
    expect(validateSettings(settings)).toEqual([]);
  });

  it('rejects branchSummary.reserveTokens negative', () => {
    const settings: Settings = { branchSummary: { reserveTokens: -5 } };
    assertErrors(settings, ['branchSummary.reserveTokens']);
  });

  it('rejects branchSummary.skipPrompt non-boolean', () => {
    const settings: Settings = { branchSummary: { skipPrompt: 1 as any } };
    assertErrors(settings, ['branchSummary.skipPrompt']);
  });

  it('rejects retry.enabled non-boolean', () => {
    const settings: Settings = { retry: { enabled: 'true' as any } };
    assertErrors(settings, ['retry.enabled']);
  });

  it('rejects retry.maxRetries negative', () => {
    const settings: Settings = { retry: { maxRetries: -3 } };
    assertErrors(settings, ['retry.maxRetries']);
  });

  it('rejects retry.baseDelayMs non-positive', () => {
    const settings: Settings = { retry: { baseDelayMs: 0 } };
    assertErrors(settings, ['retry.baseDelayMs']);
  });

  it('rejects retry.maxDelayMs non-positive', () => {
    const settings: Settings = { retry: { maxDelayMs: -10 } };
    assertErrors(settings, ['retry.maxDelayMs']);
  });

  it('accepts valid retry settings', () => {
    const settings: Settings = { retry: { enabled: true, maxRetries: 3, baseDelayMs: 100, maxDelayMs: 1000 } };
    expect(validateSettings(settings)).toEqual([]);
  });

  it('rejects terminal.showImages non-boolean', () => {
    const settings: Settings = { terminal: { showImages: 'no' as any } };
    assertErrors(settings, ['terminal.showImages']);
  });

  it('rejects terminal.imageWidthCells non-positive', () => {
    const settings: Settings = { terminal: { imageWidthCells: 0 } };
    assertErrors(settings, ['terminal.imageWidthCells']);
  });

  it('rejects terminal.clearOnShrink non-boolean', () => {
    const settings: Settings = { terminal: { clearOnShrink: 1 as any } };
    assertErrors(settings, ['terminal.clearOnShrink']);
  });

  it('rejects terminal.showTerminalProgress non-boolean', () => {
    const settings: Settings = { terminal: { showTerminalProgress: 'yes' as any } };
    assertErrors(settings, ['terminal.showTerminalProgress']);
  });

  it('accepts valid terminal settings', () => {
    const settings: Settings = { terminal: { showImages: true, imageWidthCells: 80, clearOnShrink: true, showTerminalProgress: false } };
    expect(validateSettings(settings)).toEqual([]);
  });

  it('rejects images.autoResize non-boolean', () => {
    const settings: Settings = { images: { autoResize: 'maybe' as any } };
    assertErrors(settings, ['images.autoResize']);
  });

  it('rejects images.blockImages non-boolean', () => {
    const settings: Settings = { images: { blockImages: 0 as any } };
    assertErrors(settings, ['images.blockImages']);
  });

  it('accepts valid images settings', () => {
    const settings: Settings = { images: { autoResize: true, blockImages: false } };
    expect(validateSettings(settings)).toEqual([]);
  });

  it('rejects invalid defaultThinkingLevel', () => {
    const settings: Settings = { defaultThinkingLevel: 'ultra' as any };
    assertErrors(settings, ['defaultThinkingLevel']);
  });

  it('accepts valid defaultThinkingLevel values', () => {
    ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'].forEach(level => {
      const settings: Settings = { defaultThinkingLevel: level };
      expect(validateSettings(settings)).toEqual([]);
    });
  });

  it('rejects multiple errors at once', () => {
    const settings: Settings = {
      defaultProvider: 123 as any,
      steeringMode: 'bad' as any,
      transport: 123 as any,
    };
    const errors = validateSettings(settings);
    expect(errors.map(e => e.field).sort()).toEqual(['defaultProvider', 'steeringMode', 'transport']);
  });
});

describe('validateOrThrow', () => {
  it('throws when invalid', () => {
    const settings: Settings = { defaultProvider: 123 as any };
    expect(() => validateOrThrow(settings)).toThrow('Invalid settings');
    expect(() => validateOrThrow(settings)).toThrow('defaultProvider');
  });

  it('does not throw when valid', () => {
    const settings: Settings = { defaultThinkingLevel: 'low' };
    expect(() => validateOrThrow(settings)).not.toThrow();
  });
});
