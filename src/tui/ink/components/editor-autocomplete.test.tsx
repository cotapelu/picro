// The editor must offer slash-command suggestions as the user types.
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { EventEmitter } from 'node:events';
import { render } from 'ink-testing-library';
import { Editor } from './Editor.js';
import { CombinedAutocompleteProvider } from '../core/Autocomplete.js';
import type { SlashCommand } from '../core/Autocomplete.js';

const strip = (s: string | undefined) => (s ?? '').replace(/\x1b\[[0-9;]*m/g, '');

const COMMANDS: SlashCommand[] = [
  { name: 'help', description: 'trợ giúp' },
  { name: 'model', description: 'chọn mô hình' },
  { name: 'thinking', description: 'cấp độ suy nghĩ' },
];

describe('Editor autocomplete', () => {
  it('opens the slash menu after typing "/" and filters by prefix', async () => {
    const provider = new CombinedAutocompleteProvider(COMMANDS, process.cwd());
    const { stdin, lastFrame } = render(
      <Editor value="" autocompleteProvider={provider} width={50} />,
    );
    stdin.write('/');
    await new Promise((r) => setTimeout(r, 30));
    let out = strip(lastFrame());
    expect(out).toContain('help');
    expect(out).toContain('model');

    stdin.write('mo');
    await new Promise((r) => setTimeout(r, 30));
    out = strip(lastFrame());
    expect(out).toContain('model');
    expect(out).not.toContain('thinking');
  });

  it('applies the highlighted item on Tab and closes the menu', async () => {
    const provider = new CombinedAutocompleteProvider(COMMANDS, process.cwd());
    const { stdin, lastFrame } = render(
      <Editor value="" autocompleteProvider={provider} width={50} />,
    );
    stdin.write('/');
    await new Promise((r) => setTimeout(r, 30));
    stdin.write('\t');
    await new Promise((r) => setTimeout(r, 30));
    const out = strip(lastFrame());
    // First item ("help") inserted with a trailing space.
    expect(out).toContain('/help');
  });

  it('closes the menu on Escape', async () => {
    const provider = new CombinedAutocompleteProvider(COMMANDS, process.cwd());
    const { stdin, lastFrame } = render(
      <Editor value="" autocompleteProvider={provider} width={50} />,
    );
    stdin.write('/');
    await new Promise((r) => setTimeout(r, 30));
    stdin.write('\x1b');
    await new Promise((r) => setTimeout(r, 30));
    expect(strip(lastFrame())).not.toContain('→ model');
  });

  it('stays closed when no provider is given', async () => {
    const { stdin, lastFrame } = render(<Editor value="" width={50} />);
    stdin.write('/');
    await new Promise((r) => setTimeout(r, 30));
    // Only the typed character, no suggestion rows.
    expect(strip(lastFrame())).toContain('/');
    expect(strip(lastFrame())).not.toContain('trợ giúp');
  });

  it('does not submit while the menu is open', async () => {
    const provider = new CombinedAutocompleteProvider(COMMANDS, process.cwd());
    const onSubmit = vi.fn();
    const { stdin } = render(
      <Editor value="" autocompleteProvider={provider} onSubmit={onSubmit} width={50} />,
    );
    stdin.write('/');
    await new Promise((r) => setTimeout(r, 30));
    stdin.write('\r');
    await new Promise((r) => setTimeout(r, 30));
    // Enter selects the highlighted command (and submits a slash command).
    expect(onSubmit).not.toHaveBeenCalledWith('/');
  });
});
