/**
 * Settings Validator - Validate settings values to prevent invalid configurations
 */
import type { Settings } from './settings-manager.js';
/**
 * Validation error
 */
export interface SettingsValidationError {
    field: string;
    message: string;
}
/**
 * Validate settings object
 * @returns empty array if valid, otherwise list of errors
 */
export declare function validateSettings(settings: Settings): SettingsValidationError[];
/**
 * Validate settings and throw if invalid
 */
export declare function validateOrThrow(settings: Settings): void;
//# sourceMappingURL=settings-validator.d.ts.map