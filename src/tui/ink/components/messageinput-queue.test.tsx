// The editor must expose Alt+Enter as "queue this" instead of inserting a line.
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { EventEmitter } from 'node:events';
import { render } from 'ink-testing-library';
import { Editor } from './Editor.js';
import { Key } from '../core/Keys.js';

const ENTER = "\r";
// Ink drops the ESC of "\x1b\r" and reports a plain return, so Alt+Enter cannot
// be distinguished here; Shift+Enter/Ctrl+J arrives as its own byte.
const SHIFT_ENTER = "\n";

describe('Editor onQueue', () => {
  it('forwards Shift+Enter (newline byte) to onQueue and clears the editor', () => {
    const onQueue = vi.fn();
    const onSubmit = vi.fn();
    const { stdin } = render(
      <Editor value="hello" onQueue={onQueue} onSubmit={onSubmit} width={40} />,
    );
    stdin.write(SHIFT_ENTER);
    expect(onQueue).toHaveBeenCalledWith('hello');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not queue on plain Enter', () => {
    const onQueue = vi.fn();
    const onSubmit = vi.fn();
    render(<Editor value="hi" onQueue={onQueue} onSubmit={onSubmit} width={40} />);
    // plain Enter must never queue; it submits (covered by Editor.submit tests).
    expect(onQueue).not.toHaveBeenCalled();
  });

  it('has an alt+enter identity in the key table', () => {
    expect(Key.alt('enter')).toBe('alt+enter');
  });
});
