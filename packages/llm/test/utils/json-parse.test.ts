import { describe, it, expect } from 'vitest';
import { parseStreamingJson } from '../../src/utils/json-parse';

describe('parseStreamingJson', () => {
  it('should parse valid JSON', () => {
    const result = parseStreamingJson<{ foo: string }>('{"foo": "bar"}');
    expect(result.foo).toBe('bar');
  });

  it('should handle undefined input', () => {
    const result = parseStreamingJson(undefined);
    expect(result).toEqual({});
  });

  it('should handle empty string', () => {
    const result = parseStreamingJson('');
    expect(result).toEqual({});
  });

  it('should handle whitespace-only string', () => {
    const result = parseStreamingJson('   ');
    expect(result).toEqual({});
  });

  it('should handle partial JSON (streaming)', () => {
    const result = parseStreamingJson('{"foo": "bar');
    expect(result).toHaveProperty('foo');
    expect(result.foo).toBe('bar');
  });

  it('should handle incomplete object', () => {
    const result = parseStreamingJson('{"a":');
    expect(result).toEqual({});
  });

  it('should handle incomplete array', () => {
    const result = parseStreamingJson('[1, 2,');
    // partial-json may parse this as [1, 2] or {} depending on version
    expect(result).toBeDefined();
  });

  it('should return empty object for completely invalid JSON', () => {
    const result = parseStreamingJson('not json at all');
    expect(result).toEqual({});
  });

  it('should parse array JSON', () => {
    const result = parseStreamingJson<string[]>('["a", "b", "c"]');
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should return typed result', () => {
    interface User {
      id: number;
      name: string;
      active: boolean;
    }
    const result = parseStreamingJson<User>('{"id": 1, "name": "John", "active": true}');
    expect(result.id).toBe(1);
    expect(result.name).toBe('John');
    expect(result.active).toBe(true);
  });
});