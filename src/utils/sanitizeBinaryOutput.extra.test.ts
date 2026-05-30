import { describe, it, expect } from 'vitest';
import { sanitizeBinaryOutput } from './shell.js';

describe('sanitizeBinaryOutput (extra)', () => {
  it('removes null bytes', () => {
    expect(sanitizeBinaryOutput('hello\0world')).toBe('helloworld');
  });
});
