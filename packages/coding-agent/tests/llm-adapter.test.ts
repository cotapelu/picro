import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLLMInstance } from '../src/llm-adapter.js';
import type { LLMInstance } from '@picro/llm';

// Mock @picro/llm create function
vi.mock('@picro/llm', async () => {
  const actual = await vi.importActual<Record<string, any>>('@picro/llm');
  return {
    ...actual,
    create: vi.fn().mockImplementation((def: any, options: any) => ({
      chat: vi.fn().mockResolvedValue({ content: 'response' }),
      chatWithTools: vi.fn().mockResolvedValue({ content: 'response with tools' }),
      close: vi.fn(),
    })),
  };
});

describe('LLMAdapter', () => {
  const modelDef = {
    id: 'test-model',
    name: 'Test Model',
    provider: 'openai',
    api: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: false,
    contextWindow: 4096,
    maxTokens: 1024,
    cost: { input: 0.001, output: 0.002, cacheRead: 0, cacheWrite: 0 },
  };

  it('should create LLM instance with correct api', () => {
    const llm = createLLMInstance(modelDef);
    expect(llm).toBeDefined();
    expect(typeof llm.chatWithTools).toBe('function');
  });

  it('should pass model definition to create function', () => {
    const { create } = require('@picro/llm');
    createLLMInstance(modelDef);
    expect(create).toHaveBeenCalledWith(modelDef, expect.any(Object));
  });
});
