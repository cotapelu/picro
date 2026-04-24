import { describe, it, expect } from 'vitest';
import { detectCompat, mergeCompat } from '../src/compat-detection';

describe('detectCompat', () => {
  describe('xAI (Grok)', () => {
    it('should detect xAI provider', () => {
      const compat = detectCompat('xai', 'https://api.x.ai');
      expect(compat.supportsReasoningEffort).toBe(false);
    });

    it('should detect xAI baseUrl', () => {
      const compat = detectCompat('other-provider', 'https://api.x.ai/v1');
      expect(compat.supportsReasoningEffort).toBe(false);
    });
  });

  describe('ZAI', () => {
    it('should detect ZAI provider', () => {
      const compat = detectCompat('zai', 'https://api.z.ai');
      expect(compat.thinkingFormat).toBe('zai');
    });

    it('should detect ZAI baseUrl', () => {
      const compat = detectCompat('other', 'https://api.z.ai/v1');
      expect(compat.thinkingFormat).toBe('zai');
    });
  });

  describe('OpenRouter', () => {
    it('should detect OpenRouter', () => {
      const compat = detectCompat('openrouter', 'https://openrouter.ai/api/v1');
      expect(compat.thinkingFormat).toBe('openrouter');
    });
  });

  describe('Non-standard providers', () => {
    it('should detect Cerebras', () => {
      const compat = detectCompat('cerebras', 'https://api.cerebras.ai');
      expect(compat.supportsStore).toBe(false);
    });

    it('should detect DeepSeek', () => {
      const compat = detectCompat('deepseek', 'https://api.deepseek.com');
      expect(compat.supportsStore).toBe(false);
    });
  });

  describe('Standard providers', () => {
    it('should allow store for standard providers', () => {
      const compat = detectCompat('openai', 'https://api.openai.com/v1');
      expect(compat.supportsStore).toBe(true);
    });

    it('should allow reasoning effort for standard providers', () => {
      const compat = detectCompat('openai', 'https://api.openai.com/v1');
      expect(compat.supportsReasoningEffort).toBe(true);
    });
  });

  describe('Groq and Qwen', () => {
    it('should set reasoningEffortMap for Qwen on Groq', () => {
      const compat = detectCompat('groq', 'https://api.groq.com', 'qwen/qwen-2.5-72b-instruct');
      expect(compat.reasoningEffortMap.xhigh).toBe('default');
    });
  });
});

describe('mergeCompat', () => {
  it('should return detected compat when no explicit overrides', () => {
    const detected = detectCompat('openai', 'https://api.openai.com/v1');
    const merged = mergeCompat(detected);
    expect(merged).toEqual(detected);
  });

  it('should merge explicit overrides', () => {
    const detected = detectCompat('openai', 'https://api.openai.com/v1');
    const merged = mergeCompat(detected, { requiresThinkingAsText: true });
    expect(merged.requiresThinkingAsText).toBe(true);
  });

  it('should merge reasoningEffortMap', () => {
    const detected = detectCompat('openai', 'https://api.openai.com/v1');
    const customMap = { low: 'quick', medium: 'normal' };
    const merged = mergeCompat(detected, { reasoningEffortMap: customMap });
    expect(merged.reasoningEffortMap).toEqual(customMap);
  });
});