// The CLI must resolve documented model patterns, not just bare ids.
import { describe, it, expect } from 'vitest';
import { resolveCliModel, parseModelPattern } from './model-resolver.js';
import type { ModelRegistry } from './model-registry.js';

const MODELS = [
  { id: 'gpt-5.4', provider: 'openai', name: 'GPT 5.4' },
  { id: 'gpt-4o-latest', provider: 'openai', name: 'GPT 4o' },
  { id: 'gemini-3.1-pro-preview', provider: 'google', name: 'Gemini' },
];

const registry = {
  getAll: () => MODELS,
  find: (provider: string, modelId: string) => MODELS.find(m => m.provider === provider && m.id === modelId),
  hasConfiguredAuth: () => true,
} as unknown as ModelRegistry;

describe('resolveCliModel', () => {
  it('resolves a bare model id', async () => {
    const r = await resolveCliModel({ initialModel: 'gpt-5.4', registry });
    expect(r.model?.id).toBe('gpt-5.4');
    expect(r.error).toBeUndefined();
  });

  it('resolves provider/id', async () => {
    const r = await resolveCliModel({ initialModel: 'openai/gpt-5.4', registry });
    expect(r.model?.id).toBe('gpt-5.4');
  });

  it('resolves provider/id:thinking and returns the level', async () => {
    const r = await resolveCliModel({ initialModel: 'openai/gpt-5.4:high', registry });
    expect(r.model?.id).toBe('gpt-5.4');
    expect(r.thinkingLevel).toBe('high');
  });

  it('resolves a -latest alias', async () => {
    const r = await resolveCliModel({ initialModel: 'gpt-4o-latest', registry });
    expect(r.model?.id).toBe('gpt-4o-latest');
  });

  it('reports a clear error for an unknown model', async () => {
    const r = await resolveCliModel({ initialModel: 'nope', registry });
    expect(r.model).toBeUndefined();
    expect(r.error).toContain('nope');
  });
});

describe('parseModelPattern', () => {
  it('returns no thinking level for a bare id', () => {
    const r = parseModelPattern('gpt-5.4', MODELS as any);
    expect(r.model?.id).toBe('gpt-5.4');
    expect(r.thinkingLevel).toBeUndefined();
  });
});
