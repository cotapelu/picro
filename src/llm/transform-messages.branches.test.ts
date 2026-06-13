// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for transform-messages module.
 * Covers image downgrade, thinking block handling, toolCall normalization.
 */

import { describe, it, expect } from 'vitest';
import { transformMessages } from './transform-messages.js';

function createModel(overrides: any = {}): any {
  return {
    id: 'gpt-4',
    provider: 'openai',
    api: 'openai',
    input: ['text'],
    reasoning: false,
    contextWindow: 8192,
    maxTokens: 4096,
    cost: { input: 0, output: 0, total: 0 },
    ...overrides,
  };
}

describe('transformMessages branch coverage', () => {
  describe('image handling', () => {
    it('downgrades image in user message when model lacks image support', () => {
      const model = createModel({ input: ['text'] });
      const msgs = [{
        role: 'user',
        content: [{ type: 'image', image: 'data:image/png;base64,abc' }],
      }];
      const result = transformMessages(msgs, model);
      expect(result[0].content).toEqual([{ type: 'text', text: '(image omitted: model does not support images)' }]);
    });

    it('keeps image in user message when model supports images', () => {
      const model = createModel({ input: ['text', 'image'] });
      const msgs = [{
        role: 'user',
        content: [{ type: 'image', image: 'abc' }],
      }];
      const result = transformMessages(msgs, model);
      expect(result[0].content[0].type).toBe('image');
    });
  });

  describe('thinking block handling', () => {
    it('keeps thinking block for same model', () => {
      const model = createModel({ provider: 'openai', api: 'openai', id: 'gpt-4' });
      const asstMsg = {
        role: 'assistant',
        content: [{ type: 'thinking', thinking: 'I think', thinkingSignature: 'sig' }],
        provider: 'openai',
        api: 'openai',
        model: 'gpt-4',
      };
      const result = transformMessages([asstMsg], model);
      const blocks = result[0].content;
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('thinking');
      expect(blocks[0].thinking).toBe('I think');
    });

    it('converts thinking to text for different model', () => {
      const model = createModel({ provider: 'other', api: 'other', id: 'other-model' });
      const asstMsg = {
        role: 'assistant',
        content: [{ type: 'thinking', thinking: 'I am thinking' }],
        provider: 'openai',
        api: 'openai',
        model: 'gpt-4',
      };
      const result = transformMessages([asstMsg], model);
      const blocks = result[0].content;
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('text');
      expect(blocks[0].text).toContain('I am thinking');
    });

    it('drops empty thinking block', () => {
      const model = createModel({ provider: 'other', api: 'other', id: 'other-model' });
      const asstMsg = {
        role: 'assistant',
        content: [{ type: 'thinking', thinking: '' }],
        provider: 'openai',
        api: 'openai',
        model: 'gpt-4',
      };
      const result = transformMessages([asstMsg], model);
      expect(result[0].content).toHaveLength(0);
    });
  });

  describe('toolCall handling', () => {
    it('normalizes toolCall ID with pipe and special characters for cross-model', () => {
      const model = createModel({ provider: 'other', api: 'other', id: 'other-model' });
      const asstMsg = {
        role: 'assistant',
        content: [{
          type: 'toolCall',
          id: 'abc|123-xyz@456',
          name: 'test',
          arguments: { cmd: 'echo' },
        }],
        provider: 'openai',
        api: 'openai',
        model: 'gpt-4',
      };
      const result = transformMessages([asstMsg], model);
      const toolCall = result[0].content[0];
      expect(toolCall.id).toBe('abc');
    });

    it('removes thoughtSignature from toolCall for cross-model', () => {
      const model = createModel({ provider: 'other', api: 'other', id: 'other-model' });
      const asstMsg = {
        role: 'assistant',
        content: [{
          type: 'toolCall',
          id: 'call1',
          name: 'test',
          arguments: {},
          thoughtSignature: 'sig123',
        }],
        provider: 'openai',
        api: 'openai',
        model: 'gpt-4',
      };
      const result = transformMessages([asstMsg], model);
      const toolCall = result[0].content[0];
      expect((toolCall as any).thoughtSignature).toBeUndefined();
    });
  });
});
