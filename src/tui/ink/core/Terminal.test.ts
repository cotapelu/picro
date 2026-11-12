// SPDX-License-Identifier: Apache-2.0
/**
 * ProcessTerminal lifecycle.
 *
 * start() had no idempotency guard, so a second call attached a second stdin
 * listener plus a second StdinBuffer: every keystroke was processed twice and the
 * keyboard-protocol query was re-sent (re-enabling modes the terminal had already
 * answered). stop() now detaches everything it attached.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProcessTerminal } from './Terminal.js';

let stdinOn: ReturnType<typeof vi.fn>;
let stdinOff: ReturnType<typeof vi.fn>;
let stdoutWrite: ReturnType<typeof vi.fn>;
let originals: Array<() => void> = [];

beforeEach(() => {
  stdinOn = vi.fn();
  stdinOff = vi.fn();
  stdoutWrite = vi.fn();

  const save = (obj: any, key: string, value: any) => {
    originals.push(() => { obj[key] = value; });
  };
  save(process.stdin, 'on', process.stdin.on.bind(process.stdin));
  save(process.stdin, 'removeListener', process.stdin.removeListener.bind(process.stdin));
  save(process.stdin, 'setRawMode', process.stdin.setRawMode);
  save(process.stdin, 'setEncoding', process.stdin.setEncoding);
  save(process.stdin, 'resume', process.stdin.resume);
  save(process.stdin, 'pause', process.stdin.pause);
  save(process.stdout, 'write', process.stdout.write.bind(process.stdout));

  (process.stdin as any).on = stdinOn;
  (process.stdin as any).removeListener = stdinOff;
  (process.stdin as any).setRawMode = vi.fn();
  (process.stdin as any).setEncoding = vi.fn();
  (process.stdin as any).resume = vi.fn();
  (process.stdin as any).pause = vi.fn();
  (process.stdout as any).write = stdoutWrite;
});

afterEach(() => {
  for (const restore of originals.splice(0)) restore();
});

function written(): string {
  return stdinOff.mock.calls.length >= 0 ? stdoutWrite.mock.calls.map((c) => String(c[0])).join('') : '';
}

describe('ProcessTerminal lifecycle', () => {
  it('start() enables bracketed paste and queries the keyboard protocol', () => {
    const terminal = new ProcessTerminal();
    terminal.start(() => {}, () => {});

    const out = written();
    expect(out).toContain('\x1b[?2004h'); // bracketed paste on
    expect(out).toContain('\x1b[>7u'); // kitty flags query
    expect(out).toContain('\x1b[c'); // device attributes

    terminal.stop();
  });

  it('registers exactly one stdin data listener', () => {
    const terminal = new ProcessTerminal();
    terminal.start(() => {}, () => {});
    expect(stdinOn).toHaveBeenCalledTimes(1);
    terminal.stop();
  });

  it('a second start() does not attach another stdin listener', () => {
    const terminal = new ProcessTerminal();
    terminal.start(() => {}, () => {});
    const after = stdinOn.mock.calls.length;

    terminal.start(() => {}, () => {});
    expect(stdinOn.mock.calls.length).toBe(after);
    terminal.stop();
  });

  it('a second start() still swaps in the new handlers', () => {
    const terminal = new ProcessTerminal();
    const firstInput = vi.fn();
    const secondInput = vi.fn();
    const secondResize = vi.fn();

    terminal.start(firstInput, () => {});
    terminal.start(secondInput, secondResize);

    // The StdinBuffer captured by the first start forwards to the CURRENT handler.
    const handler = stdinOn.mock.calls[0]![1] as (data: string) => void;
    handler('x');
    expect(secondInput).toHaveBeenCalledWith('x');
    expect(firstInput).not.toHaveBeenCalled();

    terminal.stop();
  });

  it('stop() detaches the stdin listener, pauses stdin and restores raw mode', () => {
    const terminal = new ProcessTerminal();
    terminal.start(() => {}, () => {});
    terminal.stop();

    expect(stdinOff).toHaveBeenCalled();
    expect((process.stdin as any).pause).toHaveBeenCalled();
    expect((process.stdin as any).setRawMode).toHaveBeenCalled();
  });

  it('stop() disables the modes start() enabled', () => {
    stdoutWrite.mockClear();
    const terminal = new ProcessTerminal();
    terminal.start(() => {}, () => {});
    stdoutWrite.mockClear();
    terminal.stop();

    const out = written();
    expect(out).toContain('\x1b[?2004l'); // bracketed paste off
  });

  it('stop() is safe when start() was never called', () => {
    const terminal = new ProcessTerminal();
    expect(() => terminal.stop()).not.toThrow();
  });

  it('stop() twice is safe', () => {
    const terminal = new ProcessTerminal();
    terminal.start(() => {}, () => {});
    terminal.stop();
    expect(() => terminal.stop()).not.toThrow();
  });
});

describe('ProcessTerminal output helpers', () => {
  it('writes escape sequences through write()', () => {
    const terminal = new ProcessTerminal();
    terminal.write('\x1b[2J');
    expect(stdoutWrite).toHaveBeenCalledWith('\x1b[2J');
  });

  it('moveBy emits the right direction and count', () => {
    const terminal = new ProcessTerminal();
    stdoutWrite.mockClear();
    terminal.moveBy(3);
    terminal.moveBy(-2);
    terminal.moveBy(0);
    expect(written()).toBe('\x1b[3B\x1b[2A');
  });

  it('setTitle strips newlines and tabs', () => {
    const terminal = new ProcessTerminal();
    stdoutWrite.mockClear();
    terminal.setTitle('a\nb\tc');
    expect(written()).toContain('a b c');
    expect(written()).not.toContain('\n');
  });

  it('progress uses the active sequence and a keepalive interval', () => {
    vi.useFakeTimers();
    try {
      const terminal = new ProcessTerminal();
      stdoutWrite.mockClear();
      terminal.setProgress(true);
      expect(written()).toContain('\x1b]9;4;3\x07');
      const before = stdoutWrite.mock.calls.length;

      vi.advanceTimersByTime(3000);
      // keepalive re-emits roughly every second
      expect(stdoutWrite.mock.calls.length).toBeGreaterThan(before);

      stdoutWrite.mockClear();
      terminal.setProgress(false);
      expect(written()).toContain('\x1b]9;4;0\x07');

      const afterOff = stdoutWrite.mock.calls.length;
      vi.advanceTimersByTime(3000);
      expect(stdoutWrite.mock.calls.length).toBe(afterOff);
    } finally {
      vi.useRealTimers();
    }
  });

  it('columns/rows fall back to env then defaults', () => {
    const terminal = new ProcessTerminal();
    const cols = terminal.columns;
    const rows = terminal.rows;
    expect(Number.isFinite(cols)).toBe(true);
    expect(Number.isFinite(rows)).toBe(true);
    expect(cols).toBeGreaterThan(0);
    expect(rows).toBeGreaterThan(0);
  });
});
