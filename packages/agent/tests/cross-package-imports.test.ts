import { describe, it, expect } from 'vitest';
import { Agent } from '@picro/agent';
import { TerminalUI, ProcessTerminal } from '@picro/tui';
import { complete, stream, getModel, getProviders } from '@picro/llm';
import { MemoryStore } from '@picro/memory';

describe('Cross-Package Imports', () => {
  describe('@picro/agent imports', () => {
    it('should export Agent class', () => {
      expect(Agent).toBeDefined();
      expect(typeof Agent).toBe('function');
    });
  });

  describe('@picro/tui imports', () => {
    it('should export TerminalUI class', () => {
      expect(TerminalUI).toBeDefined();
      expect(typeof TerminalUI).toBe('function');
    });

    it('should export ProcessTerminal class', () => {
      expect(ProcessTerminal).toBeDefined();
      expect(typeof ProcessTerminal).toBe('function');
    });
  });

  describe('@picro/llm imports', () => {
    it('should export complete function', () => {
      expect(complete).toBeDefined();
      expect(typeof complete).toBe('function');
    });

    it('should export stream function', () => {
      expect(stream).toBeDefined();
      expect(typeof stream).toBe('function');
    });

    it('should export getProviders function', () => {
      expect(getProviders).toBeDefined();
      expect(typeof getProviders).toBe('function');
    });

    it('should export getModel function', () => {
      expect(getModel).toBeDefined();
      expect(typeof getModel).toBe('function');
    });
  });

  describe('@picro/memory imports', () => {
    it('should export MemoryStore interface/class', () => {
      expect(MemoryStore).toBeDefined();
    });
  });

  describe('Integration: Agent + LLM', () => {
    it('should import Agent and LLM functions together without errors', () => {
      // This validates that packages can be imported together
      // Agent should be constructible with a model from llm
      const agentClass = Agent as any;
      expect(agentClass).toBeDefined();
      
      // LLM functions should be available
      expect(typeof complete).toBe('function');
      expect(typeof stream).toBe('function');
      expect(typeof getModel).toBe('function');
      expect(typeof getProviders).toBe('function');
    });
  });

  describe('Integration: TUI standalone', () => {
    it('should create TerminalUI instance', () => {
      const terminal = new ProcessTerminal();
      const tui = new TerminalUI(terminal);
      expect(tui).toBeInstanceOf(TerminalUI);
    });
  });
});
