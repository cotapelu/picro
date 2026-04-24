import { describe, it, expect } from 'vitest';
import * as index from '../src/index';
import type { Model, Context, Message, UserMessage, AssistantMessage, ToolResultMessage, Tool, TextContent, ImageContent, ThinkingContent, StopReason, Usage, StreamOptions } from '../src/types';

describe('index exports', () => {
  it('should export all required functions', () => {
    expect(typeof index.getModel).toBe('function');
    expect(typeof index.getProviders).toBe('function');
    expect(typeof index.getModels).toBe('function');
    expect(typeof index.stream).toBe('function');
    expect(typeof index.complete).toBe('function');
    expect(index.MODELS).toBeDefined();
    expect(index.default).toBeDefined();
  });

  it('should export type Model', () => {
    const model: Model = {} as any;
    expect(model).toBeDefined();
  });

  it('should export type Context', () => {
    const ctx: Context = {} as any;
    expect(ctx).toBeDefined();
  });

  it('should export type Message', () => {
    const msg: Message = {} as any;
    expect(msg).toBeDefined();
  });

  it('should export type Usage', () => {
    const usage: Usage = {} as any;
    expect(usage).toBeDefined();
  });

  it('should have default export with all features', () => {
    const { default: llm } = index;
    expect(llm.MODELS).toBeDefined();
    expect(typeof llm.getModel).toBe('function');
    expect(typeof llm.stream).toBe('function');
  });

  it('should have consistent MODELS export', () => {
    const { MODELS, getProviders } = index;
    const providers = getProviders();
    expect(Object.keys(MODELS).sort()).toEqual(providers.sort());
  });
});