// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for footer-data-provider.ts
 */

import { describe, it, expect, vi } from 'vitest';

// Mock child_process module: return an object with spawnSync mock and default pointing to same object
vi.mock('child_process', async () => {
  const m = { spawnSync: vi.fn() };
  return { ...m, default: m };
});

import {
  DefaultFooterDataProvider,
  createFooterDataProvider,
} from './footer-data-provider.js';

describe('DefaultFooterDataProvider', () => {
  let provider: DefaultFooterDataProvider;

  beforeEach(() => {
    provider = new DefaultFooterDataProvider();
  });

  it('getData returns initial empty data', () => {
    const data = provider.getData();
    expect(data.git).toBeUndefined();
    expect(data.extensions).toEqual([]);
    expect(data.session).toBeUndefined();
    expect(data.custom).toEqual({});
  });

  it('setGitInfo updates git info and notifies', () => {
    const callback = vi.fn();
    provider.onChange(callback);
    const gitInfo = { branch: 'main', dirty: false };

    provider.setGitInfo(gitInfo);

    const data = provider.getData();
    expect(data.git).toEqual(gitInfo);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ git: gitInfo }));
  });

  it('setExtensions replaces extensions and notifies', () => {
    const callback = vi.fn();
    provider.onChange(callback);
    const extensions = [
      { name: 'ext1', active: true },
      { name: 'ext2', active: false },
    ];

    provider.setExtensions(extensions);

    const data = provider.getData();
    expect(data.extensions).toEqual(extensions);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ extensions }));
  });

  it('setSession updates session info and notifies', () => {
    const callback = vi.fn();
    provider.onChange(callback);
    const session = { id: 'sid', model: 'gpt-4', turns: 5 };

    provider.setSession(session);

    const data = provider.getData();
    expect(data.session).toEqual(session);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ session }));
  });

  it('setCustom adds custom key-value and notifies', () => {
    const callback = vi.fn();
    provider.onChange(callback);

    provider.setCustom('key1', 'value1');
    provider.setCustom('key2', 'value2');

    let data = provider.getData();
    expect(data.custom).toEqual({ key1: 'value1', key2: 'value2' });
    expect(callback).toHaveBeenCalledTimes(2);

    provider.setCustom('key1', 'new-value');
    data = provider.getData();
    expect(data.custom.key1).toBe('new-value');
  });

  it('removeCustom deletes key and notifies', () => {
    provider.setCustom('key1', 'value1');
    provider.setCustom('key2', 'value2');

    const callback = vi.fn();
    provider.onChange(callback);

    provider.removeCustom('key1');

    const data = provider.getData();
    expect(data.custom).toEqual({ key2: 'value2' });
    expect(callback).toHaveBeenCalled();
  });

  it('onChange returns unsubscribe function', () => {
    const callback = vi.fn();
    const unsubscribe = provider.onChange(callback);

    provider.setCustom('test', 'val');
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    provider.setCustom('test2', 'val2');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('notify catches listener errors', () => {
    const errorCb = vi.fn(() => { throw new Error('oops'); });
    provider.onChange(errorCb);
    const otherCb = vi.fn();
    provider.onChange(otherCb);

    provider.setGitInfo({ branch: 'main', dirty: false });

    expect(errorCb).toHaveBeenCalled();
    expect(otherCb).toHaveBeenCalled();
  });

  it('getData returns deep copy of custom and extensions', () => {
    provider.setCustom('a', 'b');
    const data1 = provider.getData();
    const data2 = provider.getData();

    expect(data1).not.toBe(data2);
    expect(data1.custom).not.toBe(data2.custom);
    expect(data1.extensions).not.toBe(data2.extensions);
  });
});

describe('createFooterDataProvider', () => {
  it('creates an instance of DefaultFooterDataProvider', () => {
    const provider = createFooterDataProvider();
    expect(provider).toBeInstanceOf(DefaultFooterDataProvider);
  });
});

describe('getGitInfo', () => {
  beforeEach(async () => {
    const cp = await import('child_process');
    // Reset the mock to a fresh mock function before each test
    // @ts-ignore
    cp.spawnSync = vi.fn();
  });

  it('returns null when not in a git repo', async () => {
    const cp = await import('child_process');
    // @ts-ignore
    cp.spawnSync.mockReturnValue({ status: 1, stdout: '', stderr: '' });

    const mod = await import('./footer-data-provider.js');
    const gitInfo = await mod.getGitInfo('/some/path');

    expect(gitInfo).toBeNull();
  });

  it('returns git info when in a git repo', async () => {
    const cp = await import('child_process');
    // @ts-ignore
    cp.spawnSync
      .mockImplementationOnce((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'branch') return { status: 0, stdout: 'main\n', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      })
      .mockImplementationOnce((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'status') return { status: 0, stdout: '', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      })
      .mockImplementationOnce((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'rev-list') return { status: 0, stdout: '0\t0', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      });

    const mod = await import('./footer-data-provider.js');
    const gitInfo = await mod.getGitInfo('/some/path');

    expect(gitInfo).toEqual({
      branch: 'main',
      dirty: false,
      ahead: undefined,
      behind: undefined,
    });
  });

  it('detects dirty working tree', async () => {
    const cp = await import('child_process');
    // @ts-ignore
    cp.spawnSync
      .mockImplementationOnce((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'branch') return { status: 0, stdout: 'feature\n', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      })
      .mockImplementationOnce((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'status') return { status: 0, stdout: 'M file.txt\n', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      })
      .mockImplementationOnce((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'rev-list') return { status: 0, stdout: '0\t0', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      });

    const mod = await import('./footer-data-provider.js');
    const gitInfo = await mod.getGitInfo('/some/path');

    expect(gitInfo?.dirty).toBe(true);
  });

  it('includes ahead/behind counts', async () => {
    const cp = await import('child_process');
    // @ts-ignore
    cp.spawnSync
      .mockImplementationOnce((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'branch') return { status: 0, stdout: 'main\n', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      })
      .mockImplementationOnce((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'status') return { status: 0, stdout: '', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      })
      .mockImplementationOnce((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'rev-list') return { status: 0, stdout: '3\t1', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      });

    const mod = await import('./footer-data-provider.js');
    const gitInfo = await mod.getGitInfo('/some/path');

    expect(gitInfo?.ahead).toBe(3);
    expect(gitInfo?.behind).toBe(1);
  });

  it('handles spawnSync errors gracefully', async () => {
    const cp = await import('child_process');
    // @ts-ignore
    cp.spawnSync.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const mod = await import('./footer-data-provider.js');
    const gitInfo = await mod.getGitInfo('/some/path');

    expect(gitInfo).toBeNull();
  });
});
