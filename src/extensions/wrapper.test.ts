// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { wrapRegisteredTool, wrapRegisteredTools } from './wrapper.js';
import type { AgentTool } from '../session/agent-types.js';

describe('Extension wrapper utilities', () => {
  describe('wrapRegisteredTool', () => {
    it('converts AgentTool to ToolDefinition with same fields', () => {
      const tool: AgentTool = {
        name: 'test_tool',
        description: 'A test tool',
        parameters: { type: 'object', properties: { x: { type: 'string' } } },
        handler: async (args: any) => `result: ${args.x}`,
      };
      const wrapped = wrapRegisteredTool(tool);
      expect(wrapped.name).toBe('test_tool');
      expect(wrapped.description).toBe('A test tool');
      expect(wrapped.parameters).toEqual(tool.parameters);
      expect(wrapped.handler).toBe(tool.handler);
    });

    it('preserves async handler signature', () => {
      const tool: AgentTool = {
        name: 'async_tool',
        description: 'Async tool',
        parameters: {},
        handler: async () => 'done',
      };
      const wrapped = wrapRegisteredTool(tool);
      expect(typeof wrapped.handler).toBe('function');
    });
  });

  describe('wrapRegisteredTools', () => {
    it('maps array of AgentTools to ToolDefinition array', () => {
      const tools: AgentTool[] = [
        {
          name: 't1',
          description: 'Tool 1',
          parameters: {},
          handler: async () => 'r1',
        },
        {
          name: 't2',
          description: 'Tool 2',
          parameters: {},
          handler: async () => 'r2',
        },
      ];
      const wrapped = wrapRegisteredTools(tools);
      expect(wrapped).toHaveLength(2);
      expect(wrapped[0].name).toBe('t1');
      expect(wrapped[1].name).toBe('t2');
      expect(wrapped[0].handler).toBe(tools[0].handler);
      expect(wrapped[1].handler).toBe(tools[1].handler);
    });

    it('returns empty array for empty input', () => {
      const wrapped = wrapRegisteredTools([]);
      expect(wrapped).toEqual([]);
    });
  });
});
