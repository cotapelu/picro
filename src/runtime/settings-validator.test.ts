import { describe, it, expect } from 'vitest';
import { validateSettings, type SettingsValidationError } from './settings-validator.js';
import type { Settings } from './settings-manager.js';

function validate(settings: Settings): string[] {
  return validateSettings(settings).map(e => `${e.field}: ${e.message}`);
}

describe('validateSettings', () => {
  it('accepts empty settings', () => {
    const errors = validateSettings({});
    expect(errors).toEqual([]);
  });

  it('accepts valid basic settings', () => {
    const settings: Settings = {
      defaultProvider: 'openai',
      defaultModel: 'gpt-4',
      steeringMode: 'all',
      transport: 'sse',
      followUpMode: 'one-at-a-time',
    };
    expect(validateSettings(settings)).toEqual([]);
  });

  it('rejects non-string defaultProvider', () => {
    const settings: Settings = { defaultProvider: 123 as any };
    const msgs = validate(settings);
    expect(msgs).toContain('defaultProvider: must be a string');
  });

  it('rejects non-string defaultModel', () => {
    const settings: Settings = { defaultModel: true as any };
    const msgs = validate(settings);
    expect(msgs).toContain('defaultModel: must be a string');
  });

  it('rejects invalid steeringMode', () => {
    const settings: Settings = { steeringMode: 'fast' as any };
    const msgs = validate(settings);
    expect(msgs).toContain('steeringMode: must be one of all, one-at-a-time');
  });

  it('rejects invalid transport', () => {
    const settings: Settings = { transport: 'grpc' as any };
    const msgs = validate(settings);
    expect(msgs).toContain('transport: must be one of sse, websocket, polling');
  });

  it('rejects invalid followUpMode', () => {
    const settings: Settings = { followUpMode: 'parallel' as any };
    const msgs = validate(settings);
    expect(msgs).toContain('followUpMode: must be one of all, one-at-a-time');
  });

  describe('compaction settings', () => {
    it('accepts valid compaction', () => {
      const settings: Settings = {
        compaction: { enabled: true, reserveTokens: 100, keepRecentTokens: 200 },
      };
      expect(validateSettings(settings)).toEqual([]);
    });

    it('rejects non-boolean compaction.enabled', () => {
      const settings: Settings = { compaction: { enabled: 'yes' as any } };
      const msgs = validate(settings);
      expect(msgs).toContain('compaction.enabled: must be a boolean');
    });

    it('rejects negative compaction.reserveTokens', () => {
      const settings: Settings = { compaction: { reserveTokens: -1 } };
      const msgs = validate(settings);
      expect(msgs).toContain('compaction.reserveTokens: must be a non-negative number');
    });

    it('rejects negative compaction.keepRecentTokens', () => {
      const settings: Settings = { compaction: { keepRecentTokens: -5 } };
      const msgs = validate(settings);
      expect(msgs).toContain('compaction.keepRecentTokens: must be a non-negative number');
    });
  });

  describe('branchSummary settings', () => {
    it('accepts valid branchSummary', () => {
      const settings: Settings = { branchSummary: { reserveTokens: 100, skipPrompt: false } };
      expect(validateSettings(settings)).toEqual([]);
    });

    it('rejects non-number branchSummary.reserveTokens', () => {
      const settings: Settings = { branchSummary: { reserveTokens: 'many' as any } };
      const msgs = validate(settings);
      expect(msgs).toContain('branchSummary.reserveTokens: must be a non-negative number');
    });

    it('rejects negative branchSummary.reserveTokens', () => {
      const settings: Settings = { branchSummary: { reserveTokens: -10 } };
      const msgs = validate(settings);
      expect(msgs).toContain('branchSummary.reserveTokens: must be a non-negative number');
    });

    it('rejects non-boolean branchSummary.skipPrompt', () => {
      const settings: Settings = { branchSummary: { skipPrompt: 0 as any } };
      const msgs = validate(settings);
      expect(msgs).toContain('branchSummary.skipPrompt: must be a boolean');
    });
  });

  describe('retry settings', () => {
    it('accepts valid retry', () => {
      const settings: Settings = { retry: { enabled: true, maxRetries: 3, baseDelayMs: 500, maxDelayMs: 5000 } };
      expect(validateSettings(settings)).toEqual([]);
    });

    it('rejects non-boolean retry.enabled', () => {
      const settings: Settings = { retry: { enabled: 'yes' as any } };
      const msgs = validate(settings);
      expect(msgs).toContain('retry.enabled: must be a boolean');
    });

    it('rejects negative retry.maxRetries', () => {
      const settings: Settings = { retry: { maxRetries: -1 } };
      const msgs = validate(settings);
      expect(msgs).toContain('retry.maxRetries: must be a non-negative number');
    });

    it('rejects zero or negative retry.baseDelayMs', () => {
      const settings: Settings = { retry: { baseDelayMs: 0 } };
      const msgs = validate(settings);
      expect(msgs).toContain('retry.baseDelayMs: must be a positive number');
    });

    it('rejects zero or negative retry.maxDelayMs', () => {
      const settings: Settings = { retry: { maxDelayMs: -5 } };
      const msgs = validate(settings);
      expect(msgs).toContain('retry.maxDelayMs: must be a positive number');
    });
  });

  describe('terminal settings', () => {
    it('accepts valid terminal', () => {
      const settings: Settings = { terminal: { showImages: true, imageWidthCells: 80, clearOnShrink: false, showTerminalProgress: true } };
      expect(validateSettings(settings)).toEqual([]);
    });

    it('rejects non-boolean terminal.showImages', () => {
      const settings: Settings = { terminal: { showImages: 'no' as any } };
      const msgs = validate(settings);
      expect(msgs).toContain('terminal.showImages: must be a boolean');
    });

    it('rejects non-number terminal.imageWidthCells', () => {
      const settings: Settings = { terminal: { imageWidthCells: 'wide' as any } };
      const msgs = validate(settings);
      expect(msgs).toContain('terminal.imageWidthCells: must be a positive number');
    });

    it('rejects non-positive terminal.imageWidthCells', () => {
      const settings: Settings = { terminal: { imageWidthCells: -10 } };
      const msgs = validate(settings);
      expect(msgs).toContain('terminal.imageWidthCells: must be a positive number');
    });
  });

  describe('images settings', () => {
    it('accepts valid images', () => {
      const settings: Settings = { images: { autoResize: true, blockImages: false } };
      expect(validateSettings(settings)).toEqual([]);
    });

    it('rejects non-boolean images.autoResize', () => {
      const settings: Settings = { images: { autoResize: 1 as any } };
      const msgs = validate(settings);
      expect(msgs).toContain('images.autoResize: must be a boolean');
    });

    it('rejects non-boolean images.blockImages', () => {
      const settings: Settings = { images: { blockImages: 'true' as any } };
      const msgs = validate(settings);
      expect(msgs).toContain('images.blockImages: must be a boolean');
    });
  });

  describe('multiple errors', () => {
    it('accumulates all errors', () => {
      const settings: Settings = {
        defaultProvider: 123 as any,
        steeringMode: 'fast' as any,
        transport: undefined as any, // undefined is allowed? Actually transport can be undefined; it's okay.
        compaction: { enabled: 'yes' as any, reserveTokens: -5 },
      };
      const msgs = validate(settings);
      expect(msgs).toContain('defaultProvider: must be a string');
      expect(msgs).toContain('steeringMode: must be one of all, one-at-a-time');
      expect(msgs).toContain('compaction.enabled: must be a boolean');
      expect(msgs).toContain('compaction.reserveTokens: must be a non-negative number');
    });
  });
});
