import { describe, it, expect } from 'vitest';
import { validate, validateToolArguments, validateModelConfig, matchesType, hasRequiredProperties } from '../src/validation';

describe('validate', () => {
  it('should validate valid data against schema', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
    const data = { name: 'John' };
    expect(validate(schema, data).valid).toBe(true);
  });

  it('should return errors for invalid data', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
    const data = { age: 'thirty' };
    expect(validate(schema, data).valid).toBe(false);
  });

  it('should validate string type', () => {
    expect(validate({ type: 'string' }, 'hello').valid).toBe(true);
    expect(validate({ type: 'string' }, 123).valid).toBe(false);
  });

  it('should validate number type', () => {
    expect(validate({ type: 'number' }, 42).valid).toBe(true);
    expect(validate({ type: 'number' }, '42').valid).toBe(false);
  });
});

describe('validateToolArguments', () => {
  it('should validate valid tool arguments', () => {
    const toolParameters = { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] };
    const args = { city: 'Tokyo' };
    expect(validateToolArguments(toolParameters, args).valid).toBe(true);
  });

  it('should reject invalid tool arguments', () => {
    const toolParameters = { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] };
    const args = {};
    expect(validateToolArguments(toolParameters, args).valid).toBe(false);
  });

  it('should reject non-object tool parameters', () => {
    const toolParameters = { type: 'string' };
    expect(validateToolArguments(toolParameters, {}).valid).toBe(false);
  });
});

describe('validateModelConfig', () => {
  it('should validate complete model config', () => {
    const model = {
      id: 'gpt-4', name: 'GPT-4', api: 'openai', provider: 'openai',
      baseUrl: 'https://api.openai.com/v1', reasoning: false, input: ['text'],
      cost: { input: 30, output: 60, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 8192, maxTokens: 4096,
    };
    expect(validateModelConfig(model).valid).toBe(true);
  });

  it('should reject missing required fields', () => {
    const model = { id: 'gpt-4' };
    expect(validateModelConfig(model).valid).toBe(false);
  });
});

describe('matchesType', () => {
  it('should match string type', () => {
    expect(matchesType('hello', 'string')).toBe(true);
    expect(matchesType(123, 'string')).toBe(false);
  });

  it('should match number type', () => {
    expect(matchesType(123, 'number')).toBe(true);
    expect(matchesType('123', 'number')).toBe(false);
  });
});

describe('hasRequiredProperties', () => {
  it('should return true when all properties exist', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(hasRequiredProperties(obj, ['a', 'b'])).toBe(true);
  });

  it('should return false when properties are missing', () => {
    const obj = { a: 1, b: 2 };
    expect(hasRequiredProperties(obj, ['a', 'b', 'c'])).toBe(false);
  });
});