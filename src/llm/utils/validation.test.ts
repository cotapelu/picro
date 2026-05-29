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
});
