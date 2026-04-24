import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReActLoopStrategy,
  PlanSolveLoopStrategy,
  ReflectionLoopStrategy,
  SimpleLoopStrategy,
  SelfRefineLoopStrategy,
  LoopStrategyFactory,
} from '../src/loop-strategy';
import type { LLMResponse, AgentRuntimeState, ToolResult } from '../src/types';

describe('Loop Strategies', () => {
  const createResponse = (toolCalls: any[] = [], content: string = 'Response'): LLMResponse => ({
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    stopReason: toolCalls.length > 0 ? 'toolUse' : 'stop',
  });

  const createToolResult = (name: string): ToolResult => ({
    toolCallId: 'call-1',
    toolName: name,
    result: `Result from ${name}`,
    isError: false,
    metadata: { toolName: name, toolCallId: 'call-1', arguments: {} },
  });

  const initialState = (): AgentRuntimeState => ({
    round: 0,
    totalToolCalls: 0,
    totalTokens: 0,
    promptLength: 0,
    isRunning: false,
    isCancelled: false,
    toolResults: [],
    history: [],
    metadata: {},
  });

  describe('ReActLoopStrategy', () => {
    const strategy = new ReActLoopStrategy();

    it('should continue if tool calls present', () => {
      const response = createResponse([{ id: '1', name: 'tool1', arguments: {} }]);
      expect(strategy.shouldContinue(response, initialState())).toBe(true);
    });

    it('should stop if no tool calls', () => {
      const response = createResponse([], 'Final answer');
      expect(strategy.shouldContinue(response, initialState())).toBe(false);
    });

    it('should format results', () => {
      const results = [createToolResult('search')];
      const formatted = strategy.formatResults(results);
      expect(formatted).toContain('✅ SUCCESS');
      expect(formatted).toContain('search');
    });

    it('should transform prompt with round info', () => {
      const state = { ...initialState(), round: 1 };
      const transformed = strategy.transformPrompt?.('Task', state);
      expect(transformed).toContain('Round 2');
    });
  });

  describe('PlanSolveLoopStrategy', () => {
    const strategy = new PlanSolveLoopStrategy();

    it('should continue with tool calls', () => {
      const response = createResponse([{ id: '1', name: 'plan', arguments: {} }]);
      expect(strategy.shouldContinue(response, initialState())).toBe(true);
    });

    it('should stop without tool calls', () => {
      const response = createResponse([], 'Done');
      expect(strategy.shouldContinue(response, initialState())).toBe(false);
    });

    it('should add planning instruction on first round', () => {
      const state = { ...initialState(), round: 0 };
      const transformed = strategy.transformPrompt?.('Goal', state);
      expect(transformed).toContain('plan');
    });
  });

  describe('ReflectionLoopStrategy', () => {
    const strategy = new ReflectionLoopStrategy();

    it('should continue on tool calls, reset reflection round', () => {
      const state = { ...initialState(), toolResults: [createToolResult('t1')] };
      const response = createResponse([{ id: '1', name: 'reflect', arguments: {} }]);

      expect(strategy.shouldContinue(response, state)).toBe(true);
    });

    it('should request reflection after tools complete', () => {
      const state = { ...initialState(), toolResults: [createToolResult('t1')] };
      const response = createResponse([], 'Done');

      // First call after tools should continue (enter reflection)
      expect(strategy.shouldContinue(response, state)).toBe(true);
    });

    it('should stop after reflection', () => {
      const state = { ...initialState(), toolResults: [createToolResult('t1')] };
      const response = createResponse([], 'Done');

      // consume reflection round
      strategy.shouldContinue(response, state);
      // Next should stop
      expect(strategy.shouldContinue(response, state)).toBe(false);
    });
  });

  describe('SimpleLoopStrategy', () => {
    const strategy = new SimpleLoopStrategy();

    it('should continue exactly when tool calls exist', () => {
      expect(strategy.shouldContinue(createResponse([{ id: '1', name: 't', arguments: {} }]), initialState())).toBe(true);
      expect(strategy.shouldContinue(createResponse([], 'Answer'), initialState())).toBe(false);
    });

    it('should format results simply', () => {
      const formatted = strategy.formatResults([createToolResult('t1')]);
      expect(formatted).toContain('t1: Result from t1');
    });
  });

  describe('SelfRefineLoopStrategy', () => {
    const strategy = new SelfRefineLoopStrategy();

    it('should go through initial -> refine -> final phases', () => {
      let state = initialState();
      let resp1 = createResponse([{ id: '1', name: 'search', arguments: {} }]);

      // Initial: tool calls -> continue
      expect(strategy.shouldContinue(resp1, state)).toBe(true);
      expect(strategy.shouldContinue(resp1, state)).toBe(true); // still tools

      // After tools, signal to refine
      state = { ...state, toolResults: [createToolResult('search')] };
      let resp2 = createResponse([], 'Initial done');

      // Now should move to refine
      expect(strategy.shouldContinue(resp2, state)).toBe(true);
      expect(strategy.shouldContinue(resp2, state)).toBe(true); // can refine again

      // After max refines, should finalize
      expect(strategy.shouldContinue(resp2, state)).toBe(false);
    });
  });

  describe('LoopStrategyFactory', () => {
    it('should create all strategy types', () => {
      expect(LoopStrategyFactory.create('react')).toBeInstanceOf(ReActLoopStrategy);
      expect(LoopStrategyFactory.create('plan-solve')).toBeInstanceOf(PlanSolveLoopStrategy);
      expect(LoopStrategyFactory.create('reflection')).toBeInstanceOf(ReflectionLoopStrategy);
      expect(LoopStrategyFactory.create('simple')).toBeInstanceOf(SimpleLoopStrategy);
      expect(LoopStrategyFactory.create('self-refine')).toBeInstanceOf(SelfRefineLoopStrategy);
    });

    it('should default to react for unknown', () => {
      expect(LoopStrategyFactory.create('unknown' as any)).toBeInstanceOf(ReActLoopStrategy);
    });

    it('should list available strategies', () => {
      const available = LoopStrategyFactory.available();
      expect(available).toContain('react');
      expect(available).toContain('self-refine');
    });
  });
});
