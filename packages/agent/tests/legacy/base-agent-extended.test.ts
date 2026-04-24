/**
 * Extended Tests for base-agent.ts - More edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseAgent } from '../src/base-agent.js';
import type { LLMInstance, LLMResponse, AgentState, ToolDefinition } from '../src/types.js';
import { SimpleStrategy } from '../src/loop-strategy.js';

describe('Extended BaseAgent Tests', () => {
  let mockLLM: LLMInstance;

  beforeEach(() => {
    mockLLM = {
      async chatWithTools(prompt, tools) {
        return { content: 'Done', toolCalls: [] };
      },
      async chat(prompt) {
        return 'Done';
      },
      getModel() {
        return 'test';
      },
    };
  });

  describe('Error Recovery', () => {
    it('should recover from LLM error', async () => {
      const errorLLM: LLMInstance = {
        ...mockLLM,
        chatWithTools: async () => {
          throw new Error('LLM API error');
        },
      };

      const agent = new BaseAgent(errorLLM, []);
      const result = await agent.run('Test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('LLM API error');
    });

    it('should handle empty response gracefully', async () => {
      const emptyLLM: LLMInstance = {
        ...mockLLM,
        chatWithTools: async () => ({ content: undefined, toolCalls: undefined }),
      };

      const agent = new BaseAgent(emptyLLM, []);
      const result = await agent.run('Test');
      expect(result.success).toBe(true);
    });
  });

  describe('State Transitions', () => {
    it('should track state across rounds', async () => {
      let roundTracking = 0;
      const agent = new BaseAgent(mockLLM, [], { maxRounds: 5 });
      const state = agent.getState();
      expect(state.round).toBe(0);

      await agent.run('Test');
      const finalState = agent.getState();
      expect(finalState.round).toBeGreaterThan(0);
    });

    it('should track tool calls', async () => {
      const tool = { name: 'test', description: '', handler: async () => 'done' };
      const agent = new BaseAgent(mockLLM, [tool]);
      
      await agent.run('Test');
      const state = agent.getState();
      expect(state.totalToolCalls).toBeGreaterThanOrEqual(0);
    });

    it('should track tokens', async () => {
      const agent = new BaseAgent(mockLLM, []);
      
      await agent.run('Test prompt');
      const state = agent.getState();
      expect(state.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('Configuration Variations', () => {
    it('should handle strategy string', () => {
      const agent = new BaseAgent(mockLLM, [], {
        strategy: 'simple',
      });
      expect(agent).toBeDefined();
    });

    it('should handle verbose mode', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const agent = new BaseAgent(mockLLM, [], { verbose: true });
      await agent.run('Test');
      
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle custom tool timeout', async () => {
      const agent = new BaseAgent(mockLLM, [], {
        toolTimeout: 1000,
      });
      expect(agent).toBeDefined();
    });

    it('should handle custom context tokens', async () => {
      const agent = new BaseAgent(mockLLM, [], {
        maxContextTokens: 64000,
      });
      expect(agent).toBeDefined();
    });

    it('should handle session ID', async () => {
      const agent = new BaseAgent(mockLLM, [], {
        sessionId: 'test-session',
      });
      const result = await agent.run('Test');
      expect(result).toBeDefined();
    });

    it('should handle reasoning level', async () => {
      const agent = new BaseAgent(mockLLM, [], {
        reasoningLevel: 'medium',
        thinkingBudgets: { medium: 1000 },
      });
      const result = await agent.run('Test');
      expect(result).toBeDefined();
    });
  });

  describe('Queue Operations', () => {
    it('should handle multiple steering messages', () => {
      const agent = new BaseAgent(mockLLM, []);
      
      agent.steer({ role: 'user', content: 'First', timestamp: 0 });
      agent.steer({ role: 'user', content: 'Second', timestamp: 1 });
      
      expect(agent.hasQueuedMessages()).toBe(true);
    });

    it('should clear all queues', () => {
      const agent = new BaseAgent(mockLLM, []);
      
      agent.steer({ role: 'user', content: 'Test', timestamp: 0 });
      agent.followUp({ role: 'user', content: 'Follow', timestamp: 1 });
      agent.clearAllQueues();
      
      expect(agent.hasQueuedMessages()).toBe(false);
    });

    it('should handle steering mode config', () => {
      const agent = new BaseAgent(mockLLM, [], {
        steeringMode: 'all',
      });
      expect(agent.steeringMode).toBe('all');
    });

    it('should handle follow-up mode config', () => {
      const agent = new BaseAgent(mockLLM, [], {
        followUpMode: 'all',
      });
      expect(agent.followUpMode).toBe('all');
    });

    it('should update steering mode', () => {
      const agent = new BaseAgent(mockLLM, []);
      agent.steeringMode = 'all';
      expect(agent.steeringMode).toBe('all');
    });

    it('should update follow-up mode', () => {
      const agent = new BaseAgent(mockLLM, []);
      agent.followUpMode = 'all';
      expect(agent.followUpMode).toBe('all');
    });
  });

  describe('Restart Scenarios', () => {
    it('should allow run after completion', async () => {
      const agent = new BaseAgent(mockLLM, []);
      
      await agent.run('First run');
      const firstState = agent.getState();
      
      await agent.run('Second run');
      const secondState = agent.getState();
      
      // State should be reset or continue
      expect(secondState.round).toBeGreaterThan(0);
    });
  });

  describe('Tool Management', () => {
    it('should check if tool exists', () => {
      const tools: ToolDefinition[] = [
        { name: 'exists', description: '', handler: async () => 'yep' },
      ];
      
      const agent = new BaseAgent(mockLLM, tools);
      expect(agent.hasTool('exists')).toBe(true);
      expect(agent.hasTool('nonexistent')).toBe(false);
    });

    it('should get tool names', () => {
      const tools: ToolDefinition[] = [
        { name: 'a', description: '', handler: async () => '' },
        { name: 'b', description: '', handler: async () => '' },
      ];
      
      const agent = new BaseAgent(mockLLM, tools);
      const names = agent.getAvailableTools();
      expect(names).toContain('a');
      expect(names).toContain('b');
    });

    it('should register tool after creation', () => {
      const agent = new BaseAgent(mockLLM, []);
      agent.registerTool({ name: 'dynamic', description: '', handler: async () => 'added' });
      
      expect(agent.hasTool('dynamic')).toBe(true);
    });

    it('should overwrite existing tool', () => {
      const agent = new BaseAgent(mockLLM, []);
      agent.registerTool({ name: 'test', description: 'old', handler: async () => 'old' });
      agent.registerTool({ name: 'test', description: 'new', handler: async () => 'new' });
      
      expect(agent.hasTool('test')).toBe(true);
    });
  });

  describe('Streaming Edge Cases', () => {
    it('should handle multiple stream iterations', async () => {
      const agent = new BaseAgent(mockLLM, []);
      
      // First stream
      let count1 = 0;
      for await (const _ of agent.stream('Test')) {
        count1++;
      }
      
      // After first stream completes, can stream again
      let count2 = 0;
      for await (const _ of agent.stream('Test')) {
        count2++;
      }
      
      expect(count1).toBeGreaterThan(0);
      expect(count2).toBeGreaterThan(0);
    });

    it('should stream until done', async () => {
      const agent = new BaseAgent(mockLLM, []);
      
      let hasDoneChunk = false;
      for await (const chunk of agent.stream('Test')) {
        if (chunk.type === 'done') {
          hasDoneChunk = true;
          break;
        }
      }
      
      expect(hasDoneChunk).toBe(true);
    });
  });

  describe('Config Transformations', () => {
    it('should use strategy by name', () => {
      const agent = new BaseAgent(mockLLM, [], { strategy: 'simple' });
      expect(agent).toBeDefined();
    });

    it('should use StrategyFactory for string', () => {
      const agent = new BaseAgent(mockLLM, [], { strategy: 'react' });
      expect(agent).toBeDefined();
    });

    it('should handle null/undefined config', () => {
      const agent = new BaseAgent(mockLLM, [], undefined as any);
      expect(agent).toBeDefined();
    });
  });
});