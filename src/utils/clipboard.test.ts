// Tests for the cross-platform clipboard helpers.
//
// Two paths are covered: the optional `clipboardy` dependency (preferred when
// installed) and the native OS commands used as fallback. Both `execSync`
// entry points (named export and CJS interop default) share one mock so it does
// not matter which one the module under test resolves.
import { describe, it, expect, vi, afterEach } from 'vitest';

const { execSyncMock, clipboardyState } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
  clipboardyState: {
    read: undefined as undefined | (() => Promise<string>),
    write: undefined as undefined | ((text: string) => Promise<void>),
  },
}));

vi.mock('node:child_process', () => ({
  execSync: execSyncMock,
  default: { execSync: execSyncMock },
}));

vi.mock('clipboardy', () => ({
  default: {
    read: () => clipboardyState.read?.(),
    write: (text: string) => clipboardyState.write?.(text),
  },
}));

const { readClipboardText, writeClipboardText } = await import('./clipboard.js');

afterEach(() => {
  execSyncMock.mockReset();
  clipboardyState.read = undefined;
  clipboardyState.write = undefined;
});

describe('readClipboardText', () => {
  it('uses clipboardy when it can read', async () => {
    clipboardyState.read = async () => 'from clipboardy';
    expect(await readClipboardText()).toBe('from clipboardy');
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('falls back to a native command when clipboardy cannot read', async () => {
    clipboardyState.read = async () => {
      throw new Error('no helper');
    };
    execSyncMock.mockReturnValue('from native');
    expect(await readClipboardText()).toBe('from native');
    expect(execSyncMock).toHaveBeenCalled();
  });

  it('returns undefined when every command fails', async () => {
    clipboardyState.read = async () => {
      throw new Error('no helper');
    };
    execSyncMock.mockImplementation(() => {
      throw new Error('command not found');
    });
    expect(await readClipboardText()).toBeUndefined();
  });

  it('returns an empty string when the clipboard is empty', async () => {
    clipboardyState.read = async () => '';
    expect(await readClipboardText()).toBe('');
  });
});

describe('writeClipboardText', () => {
  it('uses clipboardy when it can write', async () => {
    clipboardyState.write = async () => {};
    expect(await writeClipboardText('hello')).toBe(true);
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('falls back to a native command when clipboardy fails', async () => {
    clipboardyState.write = async () => {
      throw new Error('no helper');
    };
    execSyncMock.mockReturnValue(Buffer.from(''));
    expect(await writeClipboardText('hello')).toBe(true);
    expect(execSyncMock).toHaveBeenCalled();
  });

  it('reports failure when every command fails', async () => {
    clipboardyState.write = async () => {
      throw new Error('no helper');
    };
    execSyncMock.mockImplementation(() => {
      throw new Error('no clipboard helper');
    });
    expect(await writeClipboardText('hello')).toBe(false);
  });
});
