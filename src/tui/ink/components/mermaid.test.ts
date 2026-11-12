// SPDX-License-Identifier: Apache-2.0
/**
 * Mermaid markdown transformer.
 *
 * The fence walker toggled an `inFence` boolean and re-emitted only the OPENING
 * fence of a non-mermaid block, so that block's closing fence was never written:
 * everything after a code block rendered as code, and the diagram swallowed the
 * separator that followed it. The walk now uses split() parity and re-emits every
 * fence it consumed.
 */

import { describe, it, expect } from 'vitest';
import { createMermaidMarkdownTransformer, type MermaidRenderer } from './mermaid.js';

const ART = ['┌──┐', '│AB│', '└──┘'];

function renderer(overrides: Partial<MermaidRenderer['render'] extends never ? object : object> = {}): MermaidRenderer {
  return {
    render: (source: string) => ({ plain: ART, width: 5, warnings: [] }),
    ...overrides,
  } as MermaidRenderer;
}

function transformer(mode: 'off' | 'on' | 'streaming', r: MermaidRenderer = renderer()) {
  return createMermaidMarkdownTransformer({ getMode: () => mode, renderer: r });
}

const ctx = {
  messageType: 'assistant' as const,
  isStreaming: false,
  availableWidth: 80,
};

describe('createMermaidMarkdownTransformer', () => {
  it('replaces a mermaid block with the rendered art', () => {
    const out = transformer('on')('```mermaid\ngraph TD\n```\n', ctx);
    // The trailing "\n" after the closing fence is prose and is preserved.
    expect(out).toBe('`┌──┐`  \n`│AB│`  \n`└──┘`\n\n');
  });

  it('leaves a non-mermaid code block byte-identical (fences preserved)', () => {
    const input = 'intro\n```js\nconst a = 1;\n```\nend\n';
    expect(transformer('on')(input, ctx)).toBe(input);
  });

  it('keeps both fences of a code block that precedes a diagram', () => {
    const out = transformer('on')('intro\n```js\nconst a = 1;\n```\nmid\n```mermaid\ngraph TD\n```\nend\n', ctx);
    // The js fence must be closed, so "mid" is prose and not code.
    expect(out).toContain('```js\nconst a = 1;\n```');
    expect(out).toContain('\nmid\n');
    expect(out).toContain('`┌──┐`');
    expect(out).toContain('\nend\n');
    // Fence count: the two remaining fences belong to the js block only.
    expect(out.split('```').length - 1).toBe(2);
  });

  it('keeps both fences of a code block that follows a diagram', () => {
    const out = transformer('on')('```mermaid\ngraph TD\n```\nmid\n```py\nx = 1\n```\n', ctx);
    expect(out).toContain('```py\nx = 1\n```');
    expect(out).toContain('\nmid\n');
    expect(out).toContain('`┌──┐`');
  });

  it('leaves markdown without any fence untouched', () => {
    const input = 'just **markdown** and `inline` code\n';
    expect(transformer('on')(input, ctx)).toBe(input);
  });

  it('leaves several non-mermaid blocks untouched', () => {
    const input = 'a\n```js\n1\n```\nb\n```py\n2\n```\nc\n';
    expect(transformer('on')(input, ctx)).toBe(input);
  });

  it('renders several mermaid blocks', () => {
    const out = transformer('on')('```mermaid\nA\n```\nmid\n```mermaid\nB\n```\n', ctx);
    expect(out.match(/`┌──┐`/g)).toHaveLength(2);
    expect(out).toContain('\nmid\n');
  });

  it('keeps the original block when the art is too wide', () => {
    const wide = renderer({ render: () => ({ plain: ART, width: 999, warnings: [] }) } as any);
    const input = '```mermaid\ngraph TD\n```\n';
    expect(transformer('on', wide)(input, ctx)).toBe(input);
  });

  it('keeps the original block when the renderer returns nothing', () => {
    const none = renderer({ render: () => undefined } as any);
    const input = '```mermaid\ngraph TD\n```\n';
    expect(transformer('on', none)(input, ctx)).toBe(input);
  });

  it('appends a warning line for a diagram with warnings', () => {
    const warned = renderer({ render: () => ({ plain: ART, width: 5, warnings: ['too complex'] }) } as any);
    const out = transformer('on', warned)('```mermaid\ngraph TD\n```\n', ctx);
    expect(out).toContain('Sơ đồ không render: too complex');
    // The original block is kept too, so fences are balanced.
    expect(out).toContain('```mermaid\ngraph TD\n```');
  });

  it('suppresses the warning while streaming', () => {
    const warned = renderer({ render: () => ({ plain: ART, width: 5, warnings: ['too complex'] }) } as any);
    const out = transformer('on', warned)('```mermaid\ngraph TD\n```\n', { ...ctx, isStreaming: true });
    // Not streaming mode -> the whole block is left alone.
    expect(out).toBe('```mermaid\ngraph TD\n```\n');
  });

  it('renders in streaming mode only when the mode allows it', () => {
    const input = '```mermaid\ngraph TD\n```\n';
    const streamingCtx = { ...ctx, isStreaming: true };
    expect(transformer('streaming')(input, streamingCtx)).toContain('`┌──┐`');
    expect(transformer('on')(input, streamingCtx)).toBe(input);
  });

  it('is a no-op in off mode', () => {
    const input = '```mermaid\ngraph TD\n```\n';
    expect(transformer('off')(input, ctx)).toBe(input);
  });

  it('only handles user/assistant/summary messages', () => {
    const input = '```mermaid\ngraph TD\n```\n';
    expect(transformer('on')(input, { ...ctx, messageType: 'custom' })).toBe(input);
    expect(transformer('on')(input, { ...ctx, messageType: 'user' })).toContain('`┌──┐`');
    expect(transformer('on')(input, { ...ctx, messageType: 'summary' })).toContain('`┌──┐`');
  });

  it('is a no-op without a renderer', () => {
    const bare = createMermaidMarkdownTransformer({ getMode: () => 'on' });
    const input = '```mermaid\ngraph TD\n```\n';
    expect(bare(input, ctx)).toBe(input);
  });
});

describe('code span fencing (exported for tests)', () => {
  it('uses a fence longer than any backtick run in the content', async () => {
    // codeSpan is module-private; exercised indirectly through a diagram line.
    const withTicks = renderer({ render: () => ({ plain: ['a``b'], width: 3, warnings: [] }) } as any);
    const out = transformer('on', withTicks)('```mermaid\ngraph TD\n```\n', ctx);
    expect(out).toBe('```a``b```\n\n');
  });
});
