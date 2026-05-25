"use strict";
/**
 * Schema Validation using AJV
 *
 * Validates:
 * - Tool parameters against JSON Schema
 * - API responses
 * - Model configurations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
exports.validateToolArguments = validateToolArguments;
exports.validateModelConfig = validateModelConfig;
exports.matchesType = matchesType;
exports.hasRequiredProperties = hasRequiredProperties;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const ajv = new ajv_1.default({ allErrors: true, strict: false });
(0, ajv_formats_1.default)(ajv);
/**
 * Validate data against JSON Schema
 */
function validate(schema, data) {
    try {
        const validateFn = ajv.compile(schema);
        const valid = validateFn(data);
        return {
            valid,
            errors: valid ? undefined : (validateFn.errors?.map(err => `${err.instancePath || '/'}: ${err.message}`) || ['Validation failed']),
        };
    }
    catch (error) {
        return {
            valid: false,
            errors: [`Schema compilation error: ${error.message}`],
        };
    }
}
/**
 * Validate tool arguments before sending to API
 */
function validateToolArguments(toolParameters, arguments_) {
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
function validateModelConfig(model) {
    const required = ['id', 'name', 'api', 'provider', 'baseUrl', 'reasoning', 'input', 'cost', 'contextWindow', 'maxTokens'];
    const missing = required.filter(field => model[field] === undefined);
    if (missing.length > 0) {
        return { valid: false, errors: [`Missing required fields: ${missing.join(', ')}`] };
    }
    if (!Array.isArray(model.input) || !model.input.every((i) => ['text', 'image'].includes(i))) {
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
function matchesType(value, expectedType) {
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
function hasRequiredProperties(obj, required) {
    return required.every(prop => obj.hasOwnProperty(prop));
}
//# sourceMappingURL=validation.js.map