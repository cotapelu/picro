/**
 * Tests for index.ts - Module exports
 */

import { describe, it, expect } from 'vitest';

describe('Module Exports', () => {
  describe('Main classes', () => {
    it('should export BaseAgent', async () => {
      const { BaseAgent } = await import('../src/index.js');
      expect(BaseAgent).toBeDefined();
    });

    it('should export ContextManager', async () => {
      const { ContextManager } = await import('../src/index.js');
      expect(ContextManager).toBeDefined();
    });

    it('should export ToolExecutor', async () => {
      const { ToolExecutor } = await import('../src/index.js');
      expect(ToolExecutor).toBeDefined();
    });

    it('should export EventEmitter', async () => {
      const { EventEmitter } = await import('../src/index.js');
      expect(EventEmitter).toBeDefined();
    });

    it('should export FileLogger', async () => {
      const { FileLogger } = await import('../src/index.js');
      expect(FileLogger).toBeDefined();
    });

    it('should export createConsoleLogger', async () => {
      const { createConsoleLogger } = await import('../src/index.js');
      expect(createConsoleLogger).toBeDefined();
    });

    it('should export createFileLogger', async () => {
      const { createFileLogger } = await import('../src/index.js');
      expect(createFileLogger).toBeDefined();
    });

    it('should export createStream', async () => {
      const { createStream } = await import('../src/index.js');
      expect(createStream).toBeDefined();
    });

    it('should export collectStream', async () => {
      const { collectStream } = await import('../src/index.js');
      expect(collectStream).toBeDefined();
    });

    it('should export pipeStream', async () => {
      const { pipeStream } = await import('../src/index.js');
      expect(pipeStream).toBeDefined();
    });

    it('should export supportsStreaming', async () => {
      const { supportsStreaming } = await import('../src/index.js');
      expect(supportsStreaming).toBeDefined();
    });

    it('should export mergeToolCalls', async () => {
      const { mergeToolCalls } = await import('../src/index.js');
      expect(mergeToolCalls).toBeDefined();
    });

    it('should export createProxyStream', async () => {
      const { createProxyStream } = await import('../src/index.js');
      expect(createProxyStream).toBeDefined();
    });
  });

  describe('Strategies', () => {
    it('should export ReActStrategy', async () => {
      const { ReActStrategy } = await import('../src/index.js');
      expect(ReActStrategy).toBeDefined();
    });

    it('should export PlanAndSolveStrategy', async () => {
      const { PlanAndSolveStrategy } = await import('../src/index.js');
      expect(PlanAndSolveStrategy).toBeDefined();
    });

    it('should export ReflectionStrategy', async () => {
      const { ReflectionStrategy } = await import('../src/index.js');
      expect(ReflectionStrategy).toBeDefined();
    });

    it('should export SimpleStrategy', async () => {
      const { SimpleStrategy } = await import('../src/index.js');
      expect(SimpleStrategy).toBeDefined();
    });

    it('should export SelfRefineStrategy', async () => {
      const { SelfRefineStrategy } = await import('../src/index.js');
      expect(SelfRefineStrategy).toBeDefined();
    });

    it('should export StrategyFactory', async () => {
      const { StrategyFactory } = await import('../src/index.js');
      expect(StrategyFactory).toBeDefined();
    });
  });
});