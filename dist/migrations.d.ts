/**
 * Startup migrations for upgrading from older versions.
 * These are safe to run on every startup; they skip if already done.
 */
/**
 * Migrate legacy oauth.json and settings.json apiKeys to auth.json.
 * Returns list of provider names that were migrated.
 */
export declare function migrateAuthToAuthJson(): string[];
/**
 * Migrate sessions from ~/.pi/agent/*.jsonl to proper session directories.
 * This fixes bug where sessions were saved in agent root instead of sessions/<cwd-hash>/.
 */
export declare function migrateSessionsFromAgentRoot(): number;
/**
 * Migrate commands/ to prompts/ if needed.
 */
export declare function migrateCommandsToPrompts(baseDir: string, label: string): boolean;
/**
 * Run all migrations.
 * Returns list of provider names that were migrated (for auth) and warnings.
 */
export declare function runMigrations(_cwd: string): {
    migratedAuthProviders: string[];
    deprecationWarnings: string[];
};
/**
 * Show deprecation warnings in interactive mode.
 */
export declare function showDeprecationWarnings(warnings: string[]): Promise<void>;
//# sourceMappingURL=migrations.d.ts.map