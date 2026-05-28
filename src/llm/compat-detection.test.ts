import { describe, it, expect } from 'vitest';
import { detectCompat, mergeCompat, type CompatSettings } from './compat-detection.js';

describe('detectCompat', () => {
  describe('supportsStore and supportsDeveloperRole', () => {
    it('disables for non-standard endpoints', () => {
      const comp = detectCompat('custom', 'https://cerebras.ai/v1');
      expect(comp.supportsStore).toBe(false);
      expect(comp.supportsDeveloperRole).toBe(false);
    });

    it('enables for standard openai', () => {
      const comp = detectCompat('openai', 'https://api.openai.com/v1');
      expect(comp.supportsStore).toBe(true);
      expect(comp.supportsDeveloperRole).toBe(true);
    });
  });

  describe('supportsReasoningEffort', () => {
    it('disables for xai (grok) providers', () => {
      const comp = detectCompat('xai', 'https://api.x.ai/v1');
      expect(comp.supportsReasoningEffort).toBe(false);
    });

    it('disables for zai provider', () => {
      const comp = detectCompat('zai', 'https://api.z.ai/v1');
      expect(comp.supportsReasoningEffort).toBe(false);
    });

    it('enables for others', () => {
      const comp = detectCompat('openai', 'https://api.openai.com/v1');
      expect(comp.supportsReasoningEffort).toBe(true);
    });
  });

  describe('reasoningEffortMap', () => {
    it('provides mapping for Qwen on Groq', () => {
      const comp = detectCompat('groq', 'https://groq.com', 'qwen-2.5');
      expect(comp.reasoningEffortMap).toEqual({
        minimal: 'default', low: 'default', medium: 'default', high: 'default', xhigh: 'default'
      });
    });

    it('empty mapping for other combos', () => {
      const comp = detectCompat('openai', 'https://api.openai.com/v1');
      expect(comp.reasoningEffortMap).toEqual({});
    });
  });

  describe('maxTokensParam', () => {
    it('uses max_tokens for Chutes endpoint', () => {
      const comp = detectCompat('any', 'https://chutes.ai/v1');
      expect(comp.maxTokensParam).toBe('max_tokens');
    });

    it('uses max_completion_tokens for others', () => {
      const comp = detectCompat('openai', 'https://api.openai.com/v1');
      expect(comp.maxTokensParam).toBe('max_completion_tokens');
    });
  });

  describe('thinkingFormat', () => {
    it('returns "zai" for zai provider', () => {
      const comp = detectCompat('zai', 'https://api.z.ai/v1');
      expect(comp.thinkingFormat).toBe('zai');
    });

    it('returns "openrouter" for openrouter endpoint', () => {
      const comp = detectCompat('any', 'https://openrouter.ai/v1');
      expect(comp.thinkingFormat).toBe('openrouter');
    });

    it('returns "openai" for others', () => {
      const comp = detectCompat('openai', 'https://api.openai.com/v1');
      expect(comp.thinkingFormat).toBe('openai');
    });
  });

  describe('other flags', () => {
    it('reportUsageInStream is true by default', () => {
      const comp = detectCompat('openai', 'https://api.openai.com/v1');
      expect(comp.reportUsageInStream).toBe(true);
    });

    it('needToolResultName is false', () => {
      const comp = detectCompat('openai', 'https://api.openai.com/v1');
      expect(comp.needToolResultName).toBe(false);
    });

    it('enableToolStreaming is false', () => {
      const comp = detectCompat('openai', 'https://api.openai.com/v1');
      expect(comp.enableToolStreaming).toBe(false);
    });

    it('strictModeAvailable is true', () => {
      const comp = detectCompat('openai', 'https://api.openai.com/v1');
      expect(comp.strictModeAvailable).toBe(true);
    });
  });
});

describe('mergeCompat', () => {
  it('returns detected when no user override', () => {
    const detected = detectCompat('openai', 'https://api.openai.com/v1');
    const merged = mergeCompat(detected);
    expect(merged).toEqual(detected);
  });

  it('overrides boolean flags with user values', () => {
    const detected = detectCompat('openai', 'https://api.openai.com/v1');
    const user: Partial<CompatSettings> = {
      supportsStore: false,
      supportsDeveloperRole: false,
    };
    const merged = mergeCompat(detected, user);
    expect(merged.supportsStore).toBe(false);
    expect(merged.supportsDeveloperRole).toBe(false);
    // Other flags unchanged
    expect(merged.supportsReasoningEffort).toBe(detected.supportsReasoningEffort);
  });

  it('merges reasoningEffortMap with user overrides', () => {
    const detected = detectCompat('openai', 'https://api.openai.com/v1');
    const user: Partial<CompatSettings> = {
      reasoningEffortMap: { high: 'custom' },
    };
    const merged = mergeCompat(detected, user);
    expect(merged.reasoningEffortMap.high).toBe('custom');
    expect(merged.reasoningEffortMap.medium).toBe(detected.reasoningEffortMap.medium);
  });

  it('merges nested objects openRouterSettings and vercelGatewaySettings', () => {
    const detected = detectCompat('openai', 'https://api.openai.com/v1');
    const user: Partial<CompatSettings> = {
      openRouterSettings: { foo: 'bar' },
      vercelGatewaySettings: { allowed: ['a'] },
    };
    const merged = mergeCompat(detected, user);
    expect(merged.openRouterSettings.foo).toBe('bar');
    expect(merged.vercelGatewaySettings.allowed).toEqual(['a']);
    // Original defaults should still be present
    expect(merged.strictModeAvailable).toBe(true);
  });
});
