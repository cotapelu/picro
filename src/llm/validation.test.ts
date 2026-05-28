import { describe, it, expect } from 'vitest';
import {
  validate,
  validateToolArguments,
  validateModelConfig,
  matchesType,
  hasRequiredProperties,
} from './validation.js';

describe('validate', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
    required: ['name'],
  };

  it('validates correct data', () => {
    const result = validate(schema, { name: 'Alice', age: 30 });
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('rejects missing required property', () => {
    const result = validate(schema, { age: 30 });
    expect(result.valid).toBe(false);
    expect(result.errors?.some(e => e.includes('name'))).toBe(true);
  });

  it('rejects wrong type', () => {
    const result = validate(schema, { name: 'Bob', age: 'old' });
    expect(result.valid).toBe(false);
    expect(result.errors?.some(e => e.includes('age'))).toBe(true);
  });

  it('handles invalid schema compilation', () => {
    const badSchema = { type: 'invalid' };
    const result = validate(badSchema, {});
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors![0]).toContain('Schema compilation error');
  });
});

describe('validateToolArguments', () => {
  const validParams = {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['path'],
  };

  it('accepts valid arguments', () => {
    const result = validateToolArguments(validParams, { path: '/tmp', content: 'hello' });
    expect(result.valid).toBe(true);
  });

  it('rejects when toolParameters missing type object', () => {
    const bad = { properties: {} };
    const result = validateToolArguments(bad, {});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tool parameters must have type "object"');
  });

  it('rejects when toolParameters missing properties', () => {
    const bad = { type: 'object' };
    const result = validateToolArguments(bad, {});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tool parameters must have properties');
  });

  it('forwards validation errors from schema', () => {
    const params = {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
      required: ['count'],
    };
    const result = validateToolArguments(params, { count: 'not a number' });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

describe('validateModelConfig', () => {
  const minimalValidModel = {
    id: 'model-1',
    name: 'Test Model',
    api: 'openai-completions',
    provider: 'openai',
    baseUrl: 'https://api.openai.com',
    reasoning: false,
    input: ['text'],
    cost: { input: 1.0, output: 2.0 },
    contextWindow: 1000,
    maxTokens: 500,
  };

  it('accepts valid model config', () => {
    const result = validateModelConfig(minimalValidModel);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  const missingFields = (fields: string[]) => {
    const m = { ...minimalValidModel };
    for (const f of fields) delete m[f as keyof typeof m];
    return m;
  };

  it('rejects missing required fields', () => {
    const model = missingFields(['id', 'name']);
    const result = validateModelConfig(model);
    expect(result.valid).toBe(false);
    expect(result.errors![0]).toContain('Missing required fields: id, name');
  });

  it('rejects invalid input array', () => {
    const model = { ...minimalValidModel, input: ['text', 'unknown'] };
    const result = validateModelConfig(model);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('rejects invalid cost object', () => {
    const model = { ...minimalValidModel, cost: { input: 'free' } };
    const result = validateModelConfig(model);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

describe('matchesType', () => {
  it('recognizes primitive types', () => {
    expect(matchesType('hello', 'string')).toBe(true);
    expect(matchesType(42, 'number')).toBe(true);
    expect(matchesType(true, 'boolean')).toBe(true);
    expect(matchesType(null, 'null')).toBe(true);
    expect(matchesType(undefined, 'null')).toBe(false);
    expect(matchesType({}, 'object')).toBe(true);
    expect(matchesType([], 'array')).toBe(true);
    expect(matchesType([], 'object')).toBe(false);
  });

  it('returns true for unknown type default', () => {
    expect(matchesType(123, 'whatever')).toBe(true);
  });
});

describe('hasRequiredProperties', () => {
  it('returns true when all required present', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(hasRequiredProperties(obj, ['a', 'c'])).toBe(true);
  });

  it('returns false when missing', () => {
    const obj = { a: 1 };
    expect(hasRequiredProperties(obj, ['a', 'b'])).toBe(false);
  });
});
