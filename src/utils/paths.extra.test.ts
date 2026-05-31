import { describe, it, expect } from 'vitest';
import { isLocalPath } from './paths.js';

describe('isLocalPath (extra)', () => {
  it('returns true for current directory "."', () => {
    expect(isLocalPath('.')).toBe(true);
  });
});
