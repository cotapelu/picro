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
});