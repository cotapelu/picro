/**
 * Schema Validation using AJV
 *
 * Validates:
 * - Tool parameters against JSON Schema
 * - API responses
 * - Model configurations
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

/**
 * Validate data against JSON Schema
 */
export function validate(schema: any, data: any): { valid: boolean; errors?: string[] } {
  try {
    const validateFn = ajv.compile(schema);
    const valid = validateFn(data);
    return {
      valid,
      errors: valid ? undefined : (validateFn.errors?.map(err =>
        `${err.instancePath || '/'}: ${err.message}`
      ) || ['Validation failed']),
    };
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Schema compilation error: ${error.message}`],
    };
  }
}

/**
 * Validate tool arguments before sending to API
 */
export function validateToolArguments(
  toolParameters: any,
  arguments_: Record<string, any>
): { valid: boolean; errors?: string[] } {
  // Ensure toolParameters is a valid JSON Schema
  if (!toolParameters.type || toolParameters.type !== 'object') {
    return { valid: false, errors: ['Tool parameters must have type "object"'] };
  }

  if (!toolParameters.properties) {
    return { valid: false, errors: ['Tool parameters must have properties'] };
  }

  return validate(toolParameters, arguments_);
}

/**
 * Validate that a model configuration is complete
 */
export function validateModelConfig(model: any): { valid: boolean; errors?: string[] } {
  const required = ['id', 'name', 'api', 'provider', 'baseUrl', 'reasoning', 'input', 'cost', 'contextWindow', 'maxTokens'];
  const missing = required.filter(field => model[field] === undefined);

  if (missing.length > 0) {
    return { valid: false, errors: [`Missing required fields: ${missing.join(', ')}`] };
  }

  if (!Array.isArray(model.input) || !model.input.every((i: string) => ['text', 'image'].includes(i))) {
    return { valid: false, errors: ['input must be array of "text" and/or "image"'] };
  }

  if (typeof model.cost !== 'object' || typeof model.cost.input !== 'number' || typeof model.cost.output !== 'number') {
    return { valid: false, errors: ['cost must have input and output numbers'] };
  }

  return { valid: true };
}

/**
 * Check if a value matches a type schema (lightweight)
 */
export function matchesType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number';
    case 'boolean': return typeof value === 'boolean';
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array': return Array.isArray(value);
    case 'null': return value === null;
    default: return true;
  }
}

/**
 * Deep check: ensure all required properties exist
 */
export function hasRequiredProperties(obj: any, required: string[]): boolean {
  return required.every(prop => obj.hasOwnProperty(prop));
}
