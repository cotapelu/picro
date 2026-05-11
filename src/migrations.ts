// SPDX-License-Identifier: Apache-2.0
/**
 * Migrations and deprecation warnings.
 * Minimal implementation: no migrations needed yet.
 */

/**
 * Run startup migrations.
 * @returns Object with migratedAuthProviders (string[]) and deprecationWarnings (string[])
 */
export function runMigrations(_cwd: string): { migratedAuthProviders: string[]; deprecationWarnings: string[] } {
  // No migrations yet
  return { migratedAuthProviders: [], deprecationWarnings: [] };
}

/**
 * Show deprecation warnings in interactive mode.
 */
export async function showDeprecationWarnings(_warnings: string[]): Promise<void> {
  // No warnings to show
  return;
}
