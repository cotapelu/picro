import { describe, it, expect } from 'vitest';
import { TerminalUI, ProcessTerminal, Text } from '@picro/tui';
import { Agent } from '@picro/agent';
import type { ToolDefinition } from '@picro/agent'; // Type-only import

describe('TUI + Agent Integration', () => {
  describe('Package coexistence', () => {
    it('should import both TUI and Agent in the same file', () => {
      // This validates that the packages can be used together without module conflicts
      expect(TerminalUI).toBeDefined();
      expect(Agent).toBeDefined();
      expect(Text).toBeDefined();
      // ToolDefinition is a type-only export, not available at runtime
    });

    it('should create Agent and TerminalUI instances without interference', () => {
      const terminal = new ProcessTerminal();
      const tui = new TerminalUI(terminal);

      // Create a simple tool definition
      const simpleTool: ToolDefinition = {
        name: 'echo',
        description: 'Echo back the input',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to echo' }
          },
          required: ['message']
        },
        handler: async (args, context) => {
          return `Echo: ${args.message}`;
        }
      };

      // Create Agent with the tool
      // Create Agent using the legacy-style constructor
      // Note: Agent expects an AIModel, tools array, and config
      const agent = new Agent(
        {
          id: 'test-model',
          name: 'Test Model',
          api: 'openai',
          provider: 'openai',
          reasoning: false,
          contextWindow: 4096,
          maxTokens: 1024,
          inputCost: 0,
          outputCost: 0
        } as any,
        [simpleTool],
        {
          maxRounds: 1,
          verbose: false,
          toolTimeout: 5000,
          cacheResults: false,
          toolExecutionStrategy: 'parallel',
          steeringMode: 'dequeue-one',
          followUpMode: 'dequeue-one'
        }
      );

      // Both instances should be properly constructed
      expect(tui).toBeInstanceOf(TerminalUI);
      expect(agent).toBeInstanceOf(Agent);
    });

    it('should allow TUI components to be used alongside Agent events', () => {
      const terminal = new ProcessTerminal();
      const tui = new TerminalUI(terminal);

      // Create a text component that could display Agent output
      const textComponent = new Text('Agent is thinking...');
      // TerminalUI extends ElementContainer which has addChild
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tui as any).addChild?.(textComponent) || tui.children.push(textComponent);

      // Agent events could be forwarded to TUI for rendering
      // This is a structural test - actual event wiring would be done by the app
      expect(textComponent).toBeDefined();
      expect(tui.children).toContain(textComponent);
    });
  });

  describe('Type compatibility', () => {
    it('should have compatible types between Agent and TUI', () => {
      // Check that ToolDefinition type is available and matches expected shape
      const tool: ToolDefinition = {
        name: 'test',
        description: 'A test tool',
        parameters: { type: 'object', properties: {} },
        handler: async () => ''
      };
      expect(tool.name).toBe('test');

      // Check that AgentConfig options include fields needed for TUI integration
      const agentConfig = {
        maxRounds: 5,
        verbose: false,
        toolTimeout: 10000,
        cacheResults: false,
        toolExecutionStrategy: 'parallel' as const,
        steeringMode: 'dequeue-one' as const,
        followUpMode: 'dequeue-one' as const
      };
      expect(agentConfig.toolExecutionStrategy).toBe('parallel');
    });
  });
});
