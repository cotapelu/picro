// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { expandPath, resolveToCwd, validatePathWithinBase } from './path-utils.js';
import * as os from 'node:os';
import { resolve as resolvePath } from 'node:path';

describe('expandPath', () => {
  it('expands ~ to home directory', () => {
    const result = expandPath('~/file.txt');
    expect(result).toBe(os.homedir() + '/file.txt');
  });

  it('expands just ~ to home directory', () => {
    const result = expandPath('~');
    expect(result).toBe(os.homedir());
  });

  it('leaves absolute paths unchanged', () => {
    const result = expandPath('/absolute/path');
    expect(result).toBe('/absolute/path');
  });

  it('leaves relative paths unchanged', () => {
    const result = expandPath('relative/path');
    expect(result).toBe('relative/path');
  });

  it('removes @ prefix', () => {
    const result = expandPath('@/file');
    expect(result).toBe('/file');
  });

  it('normalizes unicode spaces to regular spaces', () => {
    const nbsp = '\u00A0';
    const str = `file${nbsp}name.txt`;
    const result = expandPath(str);
    expect(result).toBe('file name.txt');
  });

  it('handles empty string', () => {
    const result = expandPath('');
    expect(result).toBe('');
  });
});

describe('resolveToCwd', () => {
  it('resolves relative path to cwd', () => {
    const result = resolveToCwd('subdir/file.txt', '/home/user');
    expect(result).toBe('/home/user/subdir/file.txt');
  });

  it('returns absolute path unchanged', () => {
    expect(resolveToCwd('/etc/config', '/home/user')).toBe('/etc/config');
  });

  it('expands ~ before resolving', () => {
    const result = resolveToCwd('~/file', '/home/user');
    expect(result).toBe(os.homedir() + '/file');
  });
});

describe('validatePathWithinBase', () => {
  it('returns true when path equals base', () => {
    expect(validatePathWithinBase('/home/user/project/file.txt', '/home/user/project')).toBe(true);
  });

  it('returns true when path is inside base', () => {
    expect(validatePathWithinBase('/home/user/project/sub/file.txt', '/home/user/project')).toBe(true);
  });

  it('returns false when path is outside base (parent traversal)', () => {
    expect(validatePathWithinBase('/home/user/../etc/passwd', '/home/user/project')).toBe(false);
    expect(validatePathWithinBase('/home/user/project/../../etc/passwd', '/home/user/project')).toBe(false);
  });

  it('returns false when path is completely different', () => {
    expect(validatePathWithinBase('/etc/passwd', '/home/user/project')).toBe(false);
  });
});
