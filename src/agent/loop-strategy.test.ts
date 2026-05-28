/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import {
  ReActLoopStrategy,
  PlanSolveLoopStrategy,
  ReflectionLoopStrategy,
  SimpleLoopStrategy,
  SelfRefineLoopStrategy,
  LoopStrategyFactory,
} from './loop-strategy.js';
import type { LLMResponse, AgentRuntimeState, ToolResult, SuccessfulToolResult, FailedToolResult } from './types.js';

// Helper to create a minimal LLMResponse
function createResponse(toolCalls?: any[]): LLMResponse {
  return {
    content: '',
    stopReason: 'stop',
    usage: { input: 0, output: 0, totalTokens: 0, cost: { input: 0, output: 0, total: 0 } },
    toolCalls: toolCalls || [],
    raw: {},
  };
}

// Helper to create AgentRuntimeState
function createState(round = 0, toolResults: ToolResult[] = []): AgentRuntimeState {
  return {
    round,
    toolResults,
    history: [],
    systemPrompt: '',
    totalToolCalls: 0,
    totalTokens: 0,
    promptLength: 0,
    isRunning: false,
    isCancelled: false,
    metadata: {},
  };
}

// Helper to create a successful ToolResult
function successResult(toolName: string, result: string, toolCallId = 'call-1'): SuccessfulToolResult {
  return {
    toolCallId,
    toolName,
    result,
    executionTime: 0,
    isError: false,
    metadata: { toolName, toolCallId, arguments: {} },
  };
}

// Helper to create an error ToolResult
function errorResult(toolName: string, error: string, toolCallId = 'call-1'): FailedToolResult {
  return {
    toolCallId,
    toolName,
    error,
    executionTime: 0,
    isError: true,
    metadata: { toolName, toolCallId, arguments: {} },
  };
}

describe('ReActLoopStrategy', () => {
  const strategy = new ReActLoopStrategy();

  describe('shouldContinue', () => {
    it('returns true when response has toolCalls', () => {
      const response = createResponse([{ name: 'read', arguments: {} }]);
      expect(strategy.shouldContinue(response, createState())).toBe(true);
    });

    it('returns false when no toolCalls', () => {
      const response = createResponse();
      expect(strategy.shouldContinue(response, createState())).toBe(false);
    });

    it('returns false when toolCalls is empty array', () => {
      const response = createResponse([]);
      expect(strategy.shouldContinue(response, createState())).toBe(false);
    });
  });

  describe('formatResults', () => {
    it('formats successful tool result', () => {
      const result = successResult('read', 'file content');
      const formatted = strategy.formatResults([result]);
      expect(formatted).toContain('✅ SUCCESS');
      expect(formatted).toContain('read');
      expect(formatted).toContain('file content');
    });

    it('formats error tool result', () => {
      const result = errorResult('bash', 'permission denied');
      const formatted = strategy.formatResults([result]);
      expect(formatted).toContain('❌ ERROR');
      expect(formatted).toContain('bash');
      expect(formatted).toContain('permission denied');
    });

    it('formats multiple results separated by double newline', () => {
      const results: ToolResult[] = [successResult('a', 'ok'), errorResult('b', 'fail')];
      const formatted = strategy.formatResults(results);
      expect(formatted).toContain('a:\nok');
      expect(formatted).toContain('b:\nfail');
    });
  });

  describe('transformPrompt', () => {
    it('adds ReAct pattern instruction with round number', () => {
      const state = createState(2);
      const prompt = strategy.transformPrompt('What is the weather?', state);
      expect(prompt).toContain('[ReAct Pattern - Round 3]');
      expect(prompt).toContain('Think step by step and use tools when needed.');
    });

    it('preserves original prompt', () => {
      const state = createState(0);
      const prompt = strategy.transformPrompt('Hello', state);
      expect(prompt).toContain('Hello');
    });
  });
});

describe('PlanSolveLoopStrategy', () => {
  const strategy = new PlanSolveLoopStrategy();

  describe('shouldContinue', () => {
    it('returns true with toolCalls', () => {
      const response = createResponse([{}]);
      expect(strategy.shouldContinue(response, createState())).toBe(true);
    });

    it('returns false without toolCalls', () => {
      const response = createResponse();
      expect(strategy.shouldContinue(response, createState())).toBe(false);
    });
  });

  describe('formatResults', () => {
    it('shows success and error counts', () => {
      const results: ToolResult[] = [successResult('t1', '1'), successResult('t2', '2'), errorResult('t3', 'e')];
      const formatted = strategy.formatResults(results);
      expect(formatted).toContain('2 done, 1 errors');
    });

    it('lists success items with result', () => {
      const results: ToolResult[] = [successResult('read', 'abcdefghijklmnop')];
      const formatted = strategy.formatResults(results);
      expect(formatted).toContain('✓ read: abcdefghijklmnop');
    });

    it('lists errors separately', () => {
      const results: ToolResult[] = [errorResult('bash', 'timeout')];
      const formatted = strategy.formatResults(results);
      expect(formatted).toContain('Errors:');
      expect(formatted).toContain('✗ bash: timeout');
    });
  });

  describe('transformPrompt', () => {
    it('adds planning phase on round 0', () => {
      const state = createState(0);
      const prompt = strategy.transformPrompt('Fix bug', state);
      expect(prompt).toContain('[Planning Phase]');
      expect(prompt).toContain('Please create a step-by-step plan before executing.');
    });

    it('adds execution phase on later rounds', () => {
      const state = createState(1);
      const prompt = strategy.transformPrompt('Fix bug', state);
      expect(prompt).toContain('[Execution Phase - Round 1]');
      expect(prompt).toContain('Continue with your plan.');
    });
  });
});

describe('ReflectionLoopStrategy', () => {
  describe('shouldContinue', () => {
    it('continues on initial toolCalls', () => {
      const strategy = new ReflectionLoopStrategy();
      const response = createResponse([{}]);
      expect(strategy.shouldContinue(response, createState(0, []))).toBe(true);
    });

    it('reflects once after tool results, then stops', () => {
      const strategy = new ReflectionLoopStrategy();
      // Initial turn with toolCalls
      let response = createResponse([{}]);
      expect(strategy.shouldContinue(response, createState(0, []))).toBe(true);

      // After tool results, should continue and increment reflectRound
      response = createResponse(); // no toolCalls
      const stateWithResults = createState(1, [successResult('t', 'ok')]);
      expect(strategy.shouldContinue(response, stateWithResults)).toBe(true);

      // Second call: reflectRound now 1, no toolCalls -> stops
      expect(strategy.shouldContinue(response, stateWithResults)).toBe(false);
    });

    it('stops without toolCalls or toolResults', () => {
      const strategy = new ReflectionLoopStrategy();
      const response = createResponse();
      const state = createState(0, []).toolResults;
      expect(strategy.shouldContinue(response, createState(0, []))).toBe(false);
    });
  });

  describe('formatResults', () => {
    it('includes count of successes and errors', () => {
      const strategy = new ReflectionLoopStrategy();
      const results: ToolResult[] = [successResult('a', 'x'), errorResult('b', 'y')];
      const formatted = strategy.formatResults(results);
      expect(formatted).toContain('1 succeeded, 1 failed');
    });

    it('lists each tool result using getResultText', () => {
      const strategy = new ReflectionLoopStrategy();
      const results: ToolResult[] = [successResult('read', 'abc')];
      const formatted = strategy.formatResults(results);
      expect(formatted).toContain('[read]: abc');
    });
  });

  describe('transformPrompt', () => {
    it('shows reflection prompt when tool results exist and reflectRound=0', () => {
      const strategy = new ReflectionLoopStrategy();
      const state = createState(1, [successResult('t', 'ok')]);
      const prompt = strategy.transformPrompt('Question?', state);
      expect(prompt).toContain('[Reflection]');
      expect(prompt).toContain('Review gathered information.');
    });

    it('shows final answer prompt after reflection', () => {
      const strategy = new ReflectionLoopStrategy();
      // Simulate reflection having been done by incrementing reflectRound
      (strategy as any).reflectRound = 1;
      const state = createState(2, [successResult('t', 'ok')]);
      const prompt = strategy.transformPrompt('Question?', state);
      expect(prompt).toContain('[Final Answer]');
    });

    it('returns original prompt when no toolResults and reflectRound=0', () => {
      const strategy = new ReflectionLoopStrategy();
      const state = createState(0, []);
      const prompt = strategy.transformPrompt('Hello', state);
      expect(prompt).toBe('Hello');
    });
  });
});

describe('SimpleLoopStrategy', () => {
  const strategy = new SimpleLoopStrategy();

  it('continues only when toolCalls exist', () => {
    expect(strategy.shouldContinue(createResponse([{}]), createState())).toBe(true);
    expect(strategy.shouldContinue(createResponse([]), createState())).toBe(false);
    expect(strategy.shouldContinue(createResponse(), createState())).toBe(false);
  });

  it('formats results as simple list', () => {
    const results: ToolResult[] = [successResult('ls', 'data'), errorResult('bash', 'fail')];
    const formatted = strategy.formatResults(results);
    expect(formatted).toContain('ls: data');
    expect(formatted).toContain('bash: fail');
  });

  it('transformPrompt returns prompt unchanged', () => {
    const prompt = strategy.transformPrompt('Hello world', createState());
    expect(prompt).toBe('Hello world');
  });
});

describe('SelfRefineLoopStrategy', () => {
  describe('shouldContinue', () => {
    it('initial: continues if toolCalls present', () => {
      const strategy = new SelfRefineLoopStrategy();
      const response = createResponse([{}]);
      expect(strategy.shouldContinue(response, createState(0, []))).toBe(true);
    });

    it('initial: if no toolCalls but toolResults exist, moves to refine and continues', () => {
      const strategy = new SelfRefineLoopStrategy();
      const response = createResponse();
      const state = createState(0, [successResult('t', 'ok')]);
      expect(strategy.shouldContinue(response, state)).toBe(true);
      expect((strategy as any).phase).toBe('refine');
    });

    it('refine: continues if toolCalls and refineCount < max', () => {
      const strategy = new SelfRefineLoopStrategy();
      (strategy as any).phase = 'refine';
      (strategy as any).refineCount = 0;
      const response = createResponse([{}]);
      const state = createState(1, [successResult('t', 'ok')]);
      expect(strategy.shouldContinue(response, state)).toBe(true);
    });

    it('refine: stops if refineCount >= max', () => {
      const strategy = new SelfRefineLoopStrategy();
      (strategy as any).phase = 'refine';
      (strategy as any).refineCount = 2; // maxRefines default 2
      const response = createResponse([{}]);
      const state = createState(1, [successResult('t', 'ok')]);
      expect(strategy.shouldContinue(response, state)).toBe(false);
    });

    it('final: stops regardless', () => {
      const strategy = new SelfRefineLoopStrategy();
      (strategy as any).phase = 'final';
      const response = createResponse([{}]);
      expect(strategy.shouldContinue(response, createState())).toBe(false);
    });
  });

  describe('formatResults', () => {
    it('shows phase and counts', () => {
      const strategy = new SelfRefineLoopStrategy();
      (strategy as any).phase = 'initial';
      const results: ToolResult[] = [successResult('a', 'x'), errorResult('b', 'y')];
      const formatted = strategy.formatResults(results);
      expect(formatted).toContain('[INITIAL Phase');
      expect(formatted).toContain('1 ok, 1 errors');
    });

    it('adds critique instructions in refine phase', () => {
      const strategy = new SelfRefineLoopStrategy();
      (strategy as any).phase = 'refine';
      (strategy as any).refineCount = 0;
      const results: ToolResult[] = [successResult('t', 'ok')];
      const formatted = strategy.formatResults(results);
      expect(formatted).toContain('Critique and improve');
      expect(formatted).toContain("What's missing?");
    });
  });

  describe('transformPrompt', () => {
    it('initial round 0: adds objective and process', () => {
      const strategy = new SelfRefineLoopStrategy();
      (strategy as any).phase = 'initial';
      const state = createState(0, []);
      const prompt = strategy.transformPrompt('Goal', state);
      expect(prompt).toContain('[Objective] Goal');
      expect(prompt).toContain('Initial Execution: gather information');
    });

    it('refine phase: adds refinement iteration', () => {
      const strategy = new SelfRefineLoopStrategy();
      (strategy as any).phase = 'refine';
      (strategy as any).refineCount = 1;
      const prompt = strategy.transformPrompt('Improve', createState(2, []));
      expect(prompt).toContain('[Refinement - Iteration 2/2]');
    });

    it('final phase: adds final synthesis', () => {
      const strategy = new SelfRefineLoopStrategy();
      (strategy as any).phase = 'final';
      const prompt = strategy.transformPrompt('All done', createState());
      expect(prompt).toContain('[Final Synthesis] All done');
    });
  });
});

describe('LoopStrategyFactory', () => {
  it('creates ReActLoopStrategy for "react"', () => {
    const s = LoopStrategyFactory.create('react');
    expect(s).toBeInstanceOf(ReActLoopStrategy);
  });

  it('creates PlanSolveLoopStrategy for "plan-solve"', () => {
    const s = LoopStrategyFactory.create('plan-solve');
    expect(s).toBeInstanceOf(PlanSolveLoopStrategy);
  });

  it('creates ReflectionLoopStrategy for "reflection"', () => {
    const s = LoopStrategyFactory.create('reflection');
    expect(s).toBeInstanceOf(ReflectionLoopStrategy);
  });

  it('creates SimpleLoopStrategy for "simple"', () => {
    const s = LoopStrategyFactory.create('simple');
    expect(s).toBeInstanceOf(SimpleLoopStrategy);
  });

  it('creates SelfRefineLoopStrategy for "self-refine"', () => {
    const s = LoopStrategyFactory.create('self-refine');
    expect(s).toBeInstanceOf(SelfRefineLoopStrategy);
  });

  it('defaults to ReAct for unknown name', () => {
    const s = LoopStrategyFactory.create('unknown' as any);
    expect(s).toBeInstanceOf(ReActLoopStrategy);
  });

  it('available returns list of strategy names', () => {
    const names = LoopStrategyFactory.available();
    expect(names).toContain('react');
    expect(names).toContain('plan-solve');
    expect(names).toContain('reflection');
    expect(names).toContain('simple');
    expect(names).toContain('self-refine');
  });
});

describe('LoopStrategy edge cases', () => {
  it('ReAct transformPrompt uses correct round', () => {
    const strategy = new ReActLoopStrategy();
    const state = createState(5);
    const prompt = strategy.transformPrompt('test', state);
    expect(prompt).toContain('[ReAct Pattern - Round 6]');
  });
});
