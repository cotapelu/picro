// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage for ModelResolver public functions.
 */

import { describe, it, expect } from 'vitest';
import {
  parseModelPattern,
  resolveModelScope,
  defaultModelPerProvider,
} from './model-resolver.js';
import type { ModelEntry } from './model-registry.js';

function model(p: string, id: string): ModelEntry {
  return { provider: p, id, name: `${p}/${id}` } as ModelEntry;
}

describe('ModelResolver branch coverage', () => {
  describe('defaultModelPerProvider', () => {
    it('contains defaults for known providers', () => {
      expect(defaultModelPerProvider.openai).toBe('gpt-5.4');
      expect(defaultModelPerProvider.anthropic).toBe('claude-opus-4-7');
      expect(defaultModelPerProvider.google).toBe('gemini-3.1-pro-preview');
    });
  });

  describe('parseModelPattern', () => {
    const models = [
      model('openai', 'gpt-4'),
      model('openai', 'gpt-5'),
      model('anthropic', 'claude-3-opus'),
      model('openrouter', 'moonshotai/kimi-k2.6'),
    ];

    it('matches exact model by id or provider/id', () => {
      let result = parseModelPattern('gpt-4', models);
      expect(result.model?.id).toBe('gpt-4');
      expect(result.thinkingLevel).toBeUndefined();

      result = parseModelPattern('openai/gpt-5', models);
      expect(result.model?.id).toBe('gpt-5');
    });

    it('parses model with thinking level suffix using colon', () => {
      const result = parseModelPattern('gpt-4:high', models);
      expect(result.model?.id).toBe('gpt-4');
      expect(result.thinkingLevel).toBe('high');
    });

    it('returns undefined when pattern has colon but invalid thinking level', () => {
      const result = parseModelPattern('gpt-4:invalid', models);
      expect(result.model).toBeUndefined();
      expect(result.thinkingLevel).toBeUndefined();
    });

    it('returns undefined when no match', () => {
      const result = parseModelPattern('nonexistent', models);
      expect(result.model).toBeUndefined();
    });

    it('parses nested prefix with thinking level', () => {
      // E.g., 'openai/gpt-4:medium'
      const result = parseModelPattern('openai/gpt-4:medium', models);
      expect(result.model?.id).toBe('gpt-4');
      expect(result.model?.provider).toBe('openai');
      expect(result.thinkingLevel).toBe('medium');
    });
  });

  describe('resolveModelScope', () => {
    const baseModel = model('openai', 'gpt-4');
    const registry = {} as any;

    it('returns undefined when scope empty', () => {
      expect(resolveModelScope(undefined, baseModel, registry)).toBeUndefined();
    });

    it('interprets pure thinking level', () => {
      const scoped = resolveModelScope('high', baseModel, registry);
      expect(scoped?.model).toBe(baseModel);
      expect(scoped?.thinkingLevel).toBe('high');
    });

    it('parses full <modelId>:<level> pattern', () => {
      const other = model('anthropic', 'claude-3-opus');
      const scoped = resolveModelScope('claude-3-opus:low', other, { getAll: () => [other] } as any);
      expect(scoped?.model.id).toBe('claude-3-opus');
      expect(scoped?.thinkingLevel).toBe('low');
    });

    it('returns undefined for unrecognized pattern', () => {
      const result = resolveModelScope('random', baseModel, registry);
      expect(result).toBeUndefined();
    });
  });
});
