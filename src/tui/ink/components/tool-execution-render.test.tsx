// Rendering tests: a tool row must name the tool and show its arguments, both
// while pending and after the result arrived.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ToolExecution } from './ToolExecution.js';
import { Transcript } from './Transcript.js';

const strip = (s: string | undefined) => (s ?? '').replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');

async function frame(instance: { lastFrame: () => string | undefined }): Promise<string> {
  let previous: string | undefined;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 25));
    const value = instance.lastFrame();
    if (value && value === previous) return value;
    previous = value;
  }
  return instance.lastFrame() ?? '';
}

describe('ToolExecution rendering', () => {
  it('shows the tool name and its arguments', async () => {
    const instance = render(
      <ToolExecution
        toolName="read"
        toolCallId="c1"
        args={{ path: 'src/main.ts', offset: 10, limit: 5 }}
        width={70}
      />,
    );
    const out = strip(await frame(instance));
    expect(out).toContain('read');
    expect(out).toContain('src/main.ts');
    expect(out).toContain('10-14');
  });

  it('shows the bash command for the bash tool', async () => {
    const instance = render(
      <ToolExecution toolName="bash" toolCallId="c2" args={{ command: 'ls -la' }} width={70} />,
    );
    expect(strip(await frame(instance))).toContain('ls -la');
  });

  it('shows the tool output after completion', async () => {
    const instance = render(
      <ToolExecution
        toolName="grep"
        toolCallId="c3"
        args={{ pattern: 'TODO', path: 'src' }}
        result={{ content: [{ type: 'text', text: '3 matches' }], isError: false, durationMs: 42 }}
        executionStarted
        argsComplete
        width={70}
      />,
    );
    const out = strip(await frame(instance));
    expect(out).toContain('3 matches');
  });
});

describe('Transcript tool rows', () => {
  it('renders tool name, arguments and result', async () => {
    const instance = render(
      <Transcript
        width={70}
        items={[
          {
            id: 't1',
            kind: 'tool',
            index: 0,
            toolName: 'bash',
            toolArgs: { command: 'ls' },
            toolResult: { content: [{ type: 'text', text: 'a.ts' }], isError: false, durationMs: 7 },
            toolPartial: false,
          },
        ]}
      />,
    );
    const out = strip(await frame(instance));
    expect(out).toContain('bash');
    expect(out).toContain('ls');
    expect(out).toContain('a.ts');
  });
});
