// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for paths.ts
 */

import { describe, it, expect } from 'vitest';
import { isLocalPath } from './paths.js';

describe('isLocalPath', () => {
  it('returns true for plain local paths', () => {
    expect(isLocalPath('./relative/path')).toBe(true);
    expect(isLocalPath('/absolute/path')).toBe(true);
    expect(isLocalPath('file.txt')).toBe(true);
    expect(isLocalPath('  file.txt  ')).toBe(true); // trimmed
  });

  it('returns false for npm: prefix', () => {
    expect(isLocalPath('npm:lodash')).toBe(false);
  });

  it('returns false for git: prefix', () => {
    expect(isLocalPath('git:https://github.com/user/repo.git')).toBe(false);
  });

  it('returns false for github: prefix', () => {
    expect(isLocalPath('github:user/repo')).toBe(false);
  });

  it('returns false for http: prefix', () => {
    expect(isLocalPath('http://example.com')).toBe(false);
  });

  it('returns false for https: prefix', () => {
    expect(isLocalPath('https://example.com')).toBe(false);
  });

  it('returns false for ssh: prefix', () => {
    expect(isLocalPath('ssh://git@example.com/repo.git')).toBe(false);
  });

  it('handles empty string after trim', () => {
    expect(isLocalPath('   ')).toBe(true); // empty after trim -> no prefix -> true (maybe considered local)
  });

  it('is case-sensitive for prefixes', () => {
    expect(isLocalPath('NPM:lodash')).toBe(true); // uppercase not recognized as prefix, considered local
    expect(isLocalPath('GITHUB:user/repo')).toBe(true);
  });

  // Additional edge‑case tests
  it('recognizes Windows drive paths as local', () => {
    expect(isLocalPath('C:\\path')).toBe(true);
  });

  it('recognizes paths with mid‑colon as local', () => {
    expect(isLocalPath('folder:sub')).toBe(true);
  });

  it('handles spaces in paths', () => {
    expect(isLocalPath('my docs/file.txt')).toBe(true);
  });

  it('handles parent directory references', () => {
    expect(isLocalPath('..')).toBe(true);
  });

  it('handles tilde expansion path', () => {
    expect(isLocalPath('~/file')).toBe(true);
  });

  it('handles numeric strings', () => {
    expect(isLocalPath('12345')).toBe(true);
  });

  it('handles exclamation mark in path', () => {
    expect(isLocalPath('path!')).toBe(true);
  });

  it('handles unicode characters', () => {
    expect(isLocalPath('đocument')).toBe(true);
  });

  it('handles question mark in path', () => {
    expect(isLocalPath('file?.txt')).toBe(true);
  });

  it('handles trailing spaces', () => {
    expect(isLocalPath('path   ')).toBe(true);
  });
});