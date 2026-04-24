/**
 * Extended Tests for loop-strategy.ts - State transitions
 */

import { describe, it, expect } from 'vitest';
import {
  ReActStrategy,
  PlanAndSolveStrategy,
  ReflectionStrategy,
  SimpleStrategy,
  SelfRefineStrategy,
  StrategyFactory,
} from '../src/loop-strategy.js';
import type { LLMResponse, ToolResult, AgentState } from '../src/types.js';

describe('Extended Loop Strategy Tests', () => {
  describe('ReAct Strategy State Machine', () => {
    const strategy = new ReActStrategy();

    it('should continue with multiple tool calls', () => {
      const response: LLMResponse = {
        toolCalls: [
          { id: 'c1', name: 'search', arguments: {} },
          { id: 'c2', name: 'calc', arguments: {} },
        ],
      };
      expect(strategy.shouldContinue(response, {} as AgentState)).toBe(true);
    });

    it('should stop with content only', () => {
      const response: LLMResponse = { content: 'Final answer' };
      expect(strategy.shouldContinue(response, {} as AgentState)).toBe(false);
    });

    it('should stop with empty response', () => {
      const response: LLMResponse = {};
      expect(strategy.shouldContinue(response, {} as AgentState)).toBe(false);
    });

    it('should add round instruction', () => {
      const state: AgentState = { round: 3 } as AgentState;
      const result = strategy.transformPrompt('Task', state);
      expect(result).toContain('Current round');
    });

    it('should format multiple results', () => {
      const results: ToolResult[] = [
        { toolCallId: '1', toolName: 'a', result: 'r1', isError: false },
        { toolCallId: '2', toolName: 'b', result: 'r2', isError: false },
        { toolCallId: '3', toolName: 'c', result: 'err', isError: true, errorMessage: 'Error' },
      ];
      const formatted = strategy.formatToolResults(results);
      expect(formatted).toContain('SUCCESS');
      expect(formatted).toContain('ERROR');
    });
  });

  describe('PlanAndSolve Strategy State Machine', () => {
    const strategy = new PlanAndSolveStrategy();

    it('should add plan instruction on round 0', () => {
      const state: AgentState = { round: 0 } as AgentState;
      const result = strategy.transformPrompt('Task', state);
      expect(result).toContain('step-by-step plan');
    });

    it('should add continue instruction on later rounds', () => {
      const state: AgentState = { round: 1 } as AgentState;
      const result = strategy.transformPrompt('Task', state);
      expect(result).toContain('Continue executing');
    });

    it('should format with step markers', () => {
      const results: ToolResult[] = [
        { toolCallId: '1', toolName: 'step1', result: 'done', isError: false },
      ];
      const formatted = strategy.formatToolResults(results);
      expect(formatted).toContain('✓');
    });
  });

  describe('Reflection Strategy State Machine', () => {
    const strategy = new ReflectionStrategy();

    it('should continue on tool calls and reset reflection flag', () => {
      const response: LLMResponse = {
        toolCalls: [{ id: 'c1', name: 'search', arguments: {} }],
      };
      expect(strategy.shouldContinue(response, {} as AgentState)).toBe(true);
    });

    it('should request reflection after tools', () => {
      const response: LLMResponse = { content: '' };
      const state = { toolResults: [{ toolCallId: '1', toolName: 'search', result: 'r', isError: false }] } as AgentState;
      expect(strategy.shouldContinue(response, state)).toBe(true);
    });

    it('should stop after one reflection', () => {
      const response: LLMResponse = { content: 'Final answer' };
      const state = { toolResults: [{ toolCallId: '1', toolName: 'search', result: 'r', isError: false }] } as AgentState;
      // First call after tools starts reflection, second should stop
      strategy.shouldContinue(response, state);
      expect(strategy.shouldContinue(response, state)).toBe(false);
    });
  });

  describe('Simple Strategy', () => {
    const strategy = new SimpleStrategy();

    it('should never modify prompt', () => {
      const result = strategy.transformPrompt('Original', {} as AgentState);
      expect(result).toBe('Original');
    });

    it('should format simply', () => {
      const results: ToolResult[] = [
        { toolCallId: '1', toolName: 'a', result: 'r', isError: false },
      ];
      const formatted = strategy.formatToolResults(results);
      expect(formatted).toContain('a');
      expect(formatted).toContain('r');
    });
  });

  describe('SelfRefine Strategy Phases', () => {
    it('should start in initial phase', () => {
      const strategy = new SelfRefineStrategy();
      const response: LLMResponse = {
        toolCalls: [{ id: 'c1', name: 'search', arguments: {} }],
      };
      expect(strategy.shouldContinue(response, {} as AgentState)).toBe(true);
    });

    it('should transition to refine after initial', () => {
      const strategy = new SelfRefineStrategy();
      const response: LLMResponse = { content: 'Initial result' };
      expect(strategy.shouldContinue(response, { toolResults: [{ toolCallId: '1', toolName: 'search', result: 'r', isError: false }] } as AgentState)).toBe(true);
    });

    it('should add phase information', () => {
      const strategy = new SelfRefineStrategy();
      const results: ToolResult[] = [
        { toolCallId: '1', toolName: 'search', result: 'r', isError: false },
      ];
      const formatted = strategy.formatToolResults(results);
      // Should contain phase info (either initial or refinement)
      expect(formatted).toContain('phase');
    });

    it('should limit refinements', () => {
      const strategy = new SelfRefineStrategy();
      const response: LLMResponse = { content: '' };
      const state = { toolResults: [] } as AgentState;
      
      // First refine
      strategy.shouldContinue(response, state);
      // Second refine should fail or stop after max
    });
  });

  describe('Strategy Factory Extensions', () => {
    it('should create self-refine strategy', () => {
      const strategy = StrategyFactory.create('self-refine');
      expect(strategy.name).toBe('Self-Refine');
    });

    it('should handle unknown strategy', () => {
      const strategy = StrategyFactory.create('invalid' as any);
      expect(strategy.name).toBe('ReAct');
    });

    it('should return available strategies', () => {
      const strategies = StrategyFactory.getAvailableStrategies();
      expect(strategies).toContain('self-refine');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tool results', () => {
      const strategy = new ReActStrategy();
      const results: ToolResult[] = [];
      const formatted = strategy.formatToolResults(results);
      expect(formatted).toBeDefined();
    });

    it('should handle empty history state', () => {
      const strategy = new PlanAndSolveStrategy();
      const state = { round: 0, toolResults: [] } as AgentState;
      const result = strategy.transformPrompt('Task', state);
      expect(result).toContain('Task');
    });

    it('should handle empty response', () => {
      const strategy = new SimpleStrategy();
      const response: LLMResponse = {};
      expect(strategy.shouldContinue(response, {} as AgentState)).toBe(false);
    });
  });

  describe('Format Tool Results Variations', () => {
    it('should format only errors', () => {
      const strategy = new ReActStrategy();
      const results: ToolResult[] = [
        { toolCallId: '1', toolName: 'fail', result: 'err', isError: true, errorMessage: 'Error' },
      ];
      const formatted = strategy.formatToolResults(results);
      expect(formatted).toContain('❌ ERROR');
    });

    it('should format only success', () => {
      const strategy = new PlanAndSolveStrategy();
      const results: ToolResult[] = [
        { toolCallId: '1', toolName: 'ok', result: 'done', isError: false },
      ];
      const formatted = strategy.formatToolResults(results);
      expect(formatted).toContain('✓');
    });

    it('should format long results', () => {
      const strategy = new SimpleStrategy();
      const results: ToolResult[] = [
        { toolCallId: '1', toolName: 'long', result: 'a'.repeat(1000), isError: false },
      ];
      const formatted = strategy.formatToolResults(results);
      expect(formatted.length).toBeGreaterThan(1000);
    });

    it('should format results with special chars', () => {
      const strategy = new ReActStrategy();
      const results: ToolResult[] = [
        { toolCallId: '1', toolName: 'special', result: 'Line1\nLine2\tTab', isError: false },
      ];
      const formatted = strategy.formatToolResults(results);
      expect(formatted).toContain('Line1');
    });
  });

  describe('Transform Prompt Variations', () => {
    it('should handle long prompts', () => {
      const strategy = new ReActStrategy();
      const longPrompt = 'a'.repeat(10000);
      const result = strategy.transformPrompt(longPrompt, {} as AgentState);
      expect(result.length).toBeGreaterThan(10000);
    });

    it('should handle unicode prompts', () => {
      const strategy = new ReActStrategy();
      const result = strategy.transformPrompt('你好世界', {} as AgentState);
      expect(result).toContain('你好世界');
    });

    it('should handle system prompts', () => {
      const strategy = new PlanAndSolveStrategy();
      const prompt = 'System: You are helpful\n\nUser: Help me';
      const state = { round: 0 } as AgentState;
      const result = strategy.transformPrompt(prompt, state);
      expect(result).toContain('System: You are helpful');
    });
  });
});