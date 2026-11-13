// Tests for per-tool renderers and the collapsed tool-call format.
import { describe, it, expect } from 'vitest';
import { formatToolCallWithArgs } from './tool-call-format.js';
import { getToolRenderers } from './tool-renderers.js';

const context = {
  args: {},
  toolCallId: 'c1',
  executionStarted: true,
  argsComplete: true,
  isPartial: false,
  expanded: false,
  showImages: true,
  isError: false,
  outputPad: 1,
};

describe('formatToolCallWithArgs', () => {
  it('collapses arguments into key=value pairs on the title line', () => {
    const out = formatToolCallWithArgs('grep', { pattern: 'foo', path: 'src' }, undefined, false);
    expect(out).toBe('grep pattern="foo" path="src"');
  });

  it('cuts long collapsed arguments to 100 characters', () => {
    const out = formatToolCallWithArgs('t', { a: 'x'.repeat(200) }, undefined, false);
    expect(out.length).toBeLessThanOrEqual('t '.length + 100);
    expect(out.endsWith('...')).toBe(true);
  });

  it('puts each argument on its own line when expanded', () => {
    const out = formatToolCallWithArgs('edit', { old_text: 'a', new_text: 'b' }, undefined, true);
    expect(out.split('\n')).toEqual(['edit', '  old_text: a', '  new_text: b']);
  });

  it('indents continuation lines of multi-line arguments', () => {
    const out = formatToolCallWithArgs('edit', { new_text: 'a\nb' }, undefined, true);
    expect(out).toContain('  new_text: a\n    b');
  });
});

describe('tool renderers', () => {
  it('renders read with its path and line range', () => {
    const renderers = getToolRenderers('read')!;
    const out = renderers.renderCall!({ path: 'src/a.ts', offset: 10, limit: 5 }, undefined, context);
    expect(out).toContain('read src/a.ts:10-14');
  });

  it('renders bash with the command', () => {
    const out = getToolRenderers('bash')!.renderCall!({ command: 'ls -la' }, undefined, context);
    expect(out).toContain('bash');
    expect(out).toContain('ls -la');
  });

  it('renders search tools with pattern and path', () => {
    const out = getToolRenderers('grep')!.renderCall!({ pattern: 'TODO', path: 'src' }, undefined, context);
    expect(out).toContain('TODO');
    expect(out).toContain('src');
  });

  it('renders edit diffs from result details', () => {
    const renderers = getToolRenderers('edit')!;
    const out = renderers.renderResult!(
      { content: [{ type: 'text', text: 'ok' }], details: { diff: '--- a\n+++ b' } },
      { expanded: true, isPartial: false },
      undefined,
      context,
    );
    expect(out).toBe('--- a\n+++ b');
  });

  it('returns undefined for unknown tools so the generic fallback runs', () => {
    expect(getToolRenderers('no-such-tool')).toBeUndefined();
  });
});
