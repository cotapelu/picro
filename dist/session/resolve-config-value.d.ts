/**
 * Resolve configuration values that may be shell commands, environment variables, or literals.
 * Moved from agent/ to session/ because it's used by auth-storage.
 *
 * Supports:
 * - "!command" - execute shell command and use stdout (cached)
 * - "ENV_VAR" - check environment variable, fallback to literal
 * - "literal" - use as-is
 */
/**
 * Resolve a config value.
 * - If starts with "!", executes as shell command (cached)
 * - Otherwise checks env var, then uses literal
 */
export declare function resolveConfigValue(config: string): string | undefined;
/**
 * Resolve without cache (for validation at startup)
 */
export declare function resolveConfigValueUncached(config: string): string | undefined;
/**
 * Resolve or throw if not found
 */
export declare function resolveConfigValueOrThrow(config: string, description: string): string;
/**
 * Resolve to number
 */
export declare function resolveConfigValueToNumber(config: string, description: string, fallback?: number): number | undefined;
/**
 * Resolve to boolean
 */
export declare function resolveConfigValueToBoolean(config: string, description: string, fallback?: boolean): boolean | undefined;
/**
 * Resolve to list (comma-separated)
 */
export declare function resolveConfigValueToList(config: string, description: string, delimiter?: string): string[];
//# sourceMappingURL=resolve-config-value.d.ts.map