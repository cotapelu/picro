/**
 * Schema Validation using AJV
 *
 * Validates:
 * - Tool parameters against JSON Schema
 * - API responses
 * - Model configurations
 */
/**
 * Validate data against JSON Schema
 */
export declare function validate(schema: any, data: any): {
    valid: boolean;
    errors?: string[];
};
/**
 * Validate tool arguments before sending to API
 */
export declare function validateToolArguments(toolParameters: any, arguments_: Record<string, any>): {
    valid: boolean;
    errors?: string[];
};
/**
 * Validate that a model configuration is complete
 */
export declare function validateModelConfig(model: any): {
    valid: boolean;
    errors?: string[];
};
/**
 * Check if a value matches a type schema (lightweight)
 */
export declare function matchesType(value: any, expectedType: string): boolean;
/**
 * Deep check: ensure all required properties exist
 */
export declare function hasRequiredProperties(obj: any, required: string[]): boolean;
//# sourceMappingURL=validation.d.ts.map