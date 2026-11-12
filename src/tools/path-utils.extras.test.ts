// Regression tests for the base-directory check.
import { describe, it, expect } from 'vitest';
import { resolve, sep } from 'node:path';
import { validatePathWithinBase } from './path-utils.js';

describe('validatePathWithinBase', () => {
  it('accepts the base directory itself', () => {
    expect(validatePathWithinBase('/a/b', '/a/b')).toBe(true);
  });

  it('accepts paths inside the base directory', () => {
    expect(validatePathWithinBase('/a/b/c/d.ts', '/a/b')).toBe(true);
  });

  it('rejects traversal out of the base directory', () => {
    expect(validatePathWithinBase('/a/b/../c/x.ts', '/a/b')).toBe(false);
    expect(validatePathWithinBase('/a/c/x.ts', '/a/b')).toBe(false);
  });

  it('does not accept a sibling that merely shares a prefix', () => {
    // "/a/bc" starts with "/a/b" as a string but is a different directory.
    expect(validatePathWithinBase('/a/bc/x.ts', '/a/b')).toBe(false);
  });

  it('still works when the base is the filesystem root', () => {
    // The old `base + "/"` check produced "//" here, so nothing matched.
    expect(validatePathWithinBase(resolve('/x/y.ts'), resolve(sep))).toBe(true);
  });

  it('handles a relative base', () => {
    expect(validatePathWithinBase(resolve('pkg/src/a.ts'), resolve('pkg'))).toBe(true);
    expect(validatePathWithinBase(resolve('other/a.ts'), resolve('pkg'))).toBe(false);
  });
});
