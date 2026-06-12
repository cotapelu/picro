// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { parseStreamingJson } from './json-parse.js';

describe('parseStreamingJson', () => {
  it('should return empty object for undefined', () => {
    const result = parseStreamingJson(undefined);
    expect(result).toEqual({});
  });

  it('should return empty object for empty string', () => {
    const result = parseStreamingJson('');
    expect(result).toEqual({});
  });

  it('should parse complete JSON object', () => {
    const input = '{"name":"test","value":123}';
    const result = parseStreamingJson<{name:string;value:number}>(input);
    expect(result).toEqual({ name: 'test', value: 123 });
  });

  it('should parse incomplete JSON using incremental parse', () => {
    const input = '{"name":"test"'; // missing closing }
    const result = parseStreamingJson<{name?:string}>(input);
    expect(result).toEqual({ name: 'test' });
  });

  it('should parse array', () => {
    const input = '[1,2,3]';
    const result = parseStreamingJson<number[]>(input);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should return empty object for invalid JSON', () => {
    const input = 'not json';
    const result = parseStreamingJson(input);
    expect(result).toEqual({});
  });

  it('should handle nested objects', () => {
    const input = '{"outer":{"inner":true}}';
    const result = parseStreamingJson<any>(input);
    expect(result).toEqual({ outer: { inner: true } });
  });

  it('should handle incomplete nested objects', () => {
    const input = '{"outer":{"inner":true';
    const result = parseStreamingJson<any>(input);
    expect(result).toEqual({ outer: { inner: true } });
  });
});
