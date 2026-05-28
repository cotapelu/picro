import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseStreamingJson } from './json-parse.js';

// Mock the 'partial-json' module
vi.mock('partial-json', () => ({
  parse: vi.fn(),
}));

import { parse as incrementalParse } from 'partial-json';

describe('parseStreamingJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty object for empty string', () => {
    expect(parseStreamingJson('')).toEqual({});
    expect(parseStreamingJson('   ')).toEqual({});
  });

  it('returns empty object for non-string input', () => {
    expect(parseStreamingJson(null)).toEqual({});
    expect(parseStreamingJson(undefined)).toEqual({});
    expect(parseStreamingJson(123)).toEqual({});
  });

  it('returns parsed object from full JSON if valid', () => {
    const result = parseStreamingJson('{"foo":"bar"}');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('returns empty object if full JSON parse fails', () => {
    // Incremental parse not provided, full parse will fail
    incrementalParse.mockReturnValue(undefined);
    const result = parseStreamingJson('invalid json');
    expect(result).toEqual({});
  });

  it('prefers incremental parse result when defined', () => {
    // Simulate incremental parse returning a partial object
    incrementalParse.mockReturnValue({ partial: true });
    const result = parseStreamingJson('{"incomplete":');
    expect(result).toEqual({ partial: true });
    // Incremental parse should be called
    expect(incrementalParse).toHaveBeenCalledWith('{"incomplete":');
  });

  it('falls back to full JSON parse when incremental returns undefined', () => {
    incrementalParse.mockReturnValue(undefined);
    // Full JSON parse will succeed
    const result = parseStreamingJson('{"valid":true}');
    expect(result).toEqual({ valid: true });
  });
});
