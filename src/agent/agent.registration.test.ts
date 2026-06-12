// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from './agent.js';
import type { AgentConfig, AgentTool, ToolDefinition, Context } from './types.js';
import type { Model } from '../llm/index.js';

// Minimal mocks
function createMockTool(name: string, implementation: any = async () => ({}))

describe('Agent tool registration', () => {
  let agent: Agent;
  let config: AgentConfig;

  beforeEach(() => {
    config = {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: process.env.OPENAI_API_KEY,
    };
    agent = new Agent(config);
  });

  describe('registerTool', () => {
    it('should register a simple tool', () => {
      const toolDef: ToolDefinition = {
        name: 'echo',
        description: 'Echoes input',
        parameters: { type: 'object', properties: { text: { type: 'string' } } },
        execute: async (input) => input,
      };
      agent.registerTool(toolDef);
      expect(agent.hasTool('echo')).toBe(true);
    });

    it('should allow registering multiple tools', () => {
      agent.registerTool({
        name: 'tool1',
        description: 'Tool 1',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({}),
      });
      agent.registerTool({
        name: 'tool2',
        description: 'Tool 2',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({}),
      });
      expect(agent.getToolNames()).toContain('tool1');
      expect(agent.getToolNames()).toContain('tool2');
    });

    it('should override existing tool with same name', () => {
      const originalImpl = vi.fn().mockResolvedValue({ original: true });
      agent.registerTool({
        name: 'duplicate',
        description: 'Original',
        parameters: { type: 'object', properties: {} },
        execute: originalImpl,
      });
      expect(agent.hasTool('duplicate')).toBe(true);

      // Override
      const newImpl = vi.fn().mockResolvedValue({ overridden: true });
      agent.registerTool({
        name: 'duplicate',
        description: 'Overridden',
        parameters: { type: 'object', properties: {} },
        execute: newImpl,
      });
      expect(agent.hasTool('duplicate')).toBe(true);
      // The underlying ToolExecutor should have replaced it
    });
  });

  describe('hasTool', () => {
    it('returns false for unregistered tool', () => {
      expect(agent.hasTool('nonexistent')).toBe(false);
    });

    it('returns true after registration', () => {
      agent.registerTool({
        name: 'check',
        description: 'Check',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({}),
      });
      expect(agent.hasTool('check')).toBe(true);
    });
  });

  describe('getToolNames', () => {
    it('returns empty array when no tools registered', () => {
      expect(agent.getToolNames()).toEqual([]);
    });

    it('returns all registered tool names', () => {
      agent.registerTool({
        name: 'a',
        description: 'A',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({}),
      });
      agent.registerTool({
        name: 'b',
        description: 'B',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({}),
      });
      const names = agent.getToolNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('a');
      expect(names).toContain('b');
    });
  });
});

// Helper to create a minimal AgentConfig if needed
function createMinimalConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
    maxRounds: 10,
    ...overrides,
  } as AgentConfig;
}
