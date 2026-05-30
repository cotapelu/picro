import { describe, it, expect } from 'vitest';
import { validateToolCall } from './validation';

describe('validateToolCall', () => {
  it('should throw if tool not found', () => {
    const tools = [{ name: 'read', parameters: { type: 'object' } }];
    const toolCall = { name: 'write', arguments: { path: 'file' } };
    expect(() => validateToolCall(tools, toolCall)).toThrow('Tool "write" chưa được đăng ký');
  });

  it('should return validated arguments when valid', () => {
    const tools = [{ name: 'read', parameters: { type: 'object', properties: { path: { type: 'string' } } } }];
    const toolCall = { name: 'read', arguments: { path: 'file.txt' } };
    const result = validateToolCall(tools, toolCall);
    expect(result).toEqual({ path: 'file.txt' });
  });

  it('should throw validation error when type mismatch', () => {
    const tools = [{ name: 'read', parameters: { type: 'object', properties: { path: { type: 'string' } } } }];
    const toolCall = { name: 'read', arguments: { path: { nested: 'object' } } };
    expect(() => validateToolCall(tools, toolCall)).toThrow(/Tool "read" lỗi validate/);
  });

  it('should handle missing required properties', () => {
    const tools = [{ name: 'read', parameters: { type: 'object', required: ['path'], properties: { path: { type: 'string' } } } }];
    const toolCall = { name: 'read', arguments: {} };
    expect(() => validateToolCall(tools, toolCall)).toThrow(/lỗi validate/);
  });

  it('should return a copy of arguments, not the original', () => {
    const tools = [{ name: 'read', parameters: { type: 'object' } }];
    const originalArgs = { path: 'file' };
    const toolCall = { name: 'read', arguments: originalArgs };
    const result = validateToolCall(tools, toolCall);
    expect(result).not.toBe(originalArgs);
    expect(result).toEqual(originalArgs);
  });

  it('should coerce numeric strings to numbers', () => {
    const tools = [{ name: 'calc', parameters: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } } }];
    const toolCall = { name: 'calc', arguments: { x: '10', y: '20' } };
    const result = validateToolCall(tools, toolCall);
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
  });

  it('should handle optional properties', () => {
    const tools = [{ name: 'search', parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } } } }];
    const toolCall = { name: 'search', arguments: { query: 'test' } };
    const result = validateToolCall(tools, toolCall);
    expect(result.query).toBe('test');
    expect(result.limit).toBeUndefined();
  });

  it('should validate array items', () => {
    const tools = [{ name: 'bulk', parameters: { type: 'object', properties: { items: { type: 'array', items: { type: 'string' } } } } }];
    const toolCall = { name: 'bulk', arguments: { items: ['a', 'b', 'c'] } };
    const result = validateToolCall(tools, toolCall);
    expect(result.items).toEqual(['a', 'b', 'c']);
  });

  it('should throw for invalid array item type', () => {
    const tools = [{ name: 'bulk', parameters: { type: 'object', properties: { items: { type: 'array', items: { type: 'number' } } } } }];
    const toolCall = { name: 'bulk', arguments: { items: [1, 'two'] } };
    expect(() => validateToolCall(tools, toolCall)).toThrow(/lỗi validate/);
  });

  it('should handle nested objects', () => {
    const tools = [{
      name: 'complex',
      parameters: {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              timeout: { type: 'number' },
            },
          },
        },
      },
    }];
    const toolCall = { name: 'complex', arguments: { config: { timeout: 5000 } } };
    const result = validateToolCall(tools, toolCall);
    expect(result.config.timeout).toBe(5000);
  });
});
