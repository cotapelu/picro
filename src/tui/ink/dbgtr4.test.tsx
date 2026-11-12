import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Transcript } from './components/Transcript.js';
describe('dbgtr4', () => {
  it('tool + bash show result', async () => {
    const items = [
      { id: 'c', kind: 'tool', index: 0, toolName: 'bash', toolArgs: { command: 'ls' }, toolResult: { content: [{ type: 'text', text: 'a.ts' }], isError: false, durationMs: 5 }, toolPartial: false },
      { id: 'd', kind: 'bash', index: 1, command: 'ls', output: 'a.ts', exitCode: 0 },
    ] as any;
    const instance = render(<Transcript items={items} width={70} />);
    await new Promise((r) => setTimeout(r, 120));
    const out = (instance.lastFrame() ?? '').replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
    console.log('FRAME:\n' + out);
    expect(out).toContain('a.ts');
  });
});
