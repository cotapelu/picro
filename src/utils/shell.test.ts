import { describe, it, expect } from 'vitest';
import { sanitizeBinaryOutput, getShellEnv } from './shell';

describe('sanitizeBinaryOutput', () => {
  it('removes null bytes', () => {
    expect(sanitizeBinaryOutput('a\x00b')).toBe('ab');
  });

  it('removes other control characters in range 0x01-0x1F except tab, LF, CR', () => {
    // 0x01 to 0x08, 0x0B, 0x0C, 0x0E-0x1F
    const input = 'H\x01e\x02l\x03l\x04o\x05\x0b\x0c\x0e\x1f';
    expect(sanitizeBinaryOutput(input)).toBe('Hello');
  });

  it('keeps tab (0x09), newline (0x0A), carriage return (0x0D)', () => {
    expect(sanitizeBinaryOutput('Hello\tWorld\n\r')).toBe('Hello\tWorld\n\r');
  });

  it('removes Unicode format characters (0xFFF9-0xFFFB)', () => {
    // Interlinear annotation format characters
    const input = 'A\uFFFBB';
    expect(sanitizeBinaryOutput(input)).toBe('AB');
  });

  it('handles empty string', () => {
    expect(sanitizeBinaryOutput('')).toBe('');
  });

  it('handles string with only allowed control characters', () => {
    expect(sanitizeBinaryOutput('\t\n\r')).toBe('\t\n\r');
  });

  it('handles mixed content', () => {
    const input = 'Hello\x00World\t!\n';
    expect(sanitizeBinaryOutput(input)).toBe('HelloWorld\t!\n');
  });
});

describe('getShellEnv', () => {
  it('returns an object with PATH', () => {
    const env = getShellEnv();
    expect(typeof env).toBe('object');
    expect(env).toHaveProperty('PATH');
  });

  it('copies process.env', () => {
    const env = getShellEnv();
    // Should have same values as process.env for known keys
    Object.keys(process.env).forEach(key => {
      expect(env[key]).toBe(process.env[key]);
    });
  });
});
