// SPDX-License-Identifier: Apache-2.0
/**
 * Resolve configuration values that may be shell commands, environment variables, or literals.
 *
 * Supports:
 * - "!command" - execute shell command and use stdout (cached)
 * - "ENV_VAR" - check environment variable, fallback to literal
 * - "literal" - use as-is
 */

import { execSync, spawnSync } from 'child_process';
import { getShellConfig } from './utils/shell.js';

// Cache for shell command results (process lifetime)
const commandResultCache = new Map<string, string | undefined>();

/**
 * Resolve a config value.
 * - If starts with "!", executes as shell command (cached)
 * - Otherwise checks env var, then uses literal
 */
export function resolveConfigValue(config: string): string | undefined {
  if (config.startsWith('!')) {
    return executeCommand(config);
  }
  const envValue = process.env[config];
  return envValue || config;
}

function executeWithConfiguredShell(command: string): { executed: boolean; value: string | undefined } {
  try {
    const { shell, args } = getShellConfig();
    const result = spawnSync(shell, [...args, command], {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: false,
      windowsHide: true,
    });

    if (result.error) {
      const err = result.error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') return { executed: false, value: undefined };
      return { executed: true, value: undefined };
    }

    if (result.status !== 0) return { executed: true, value: undefined };

    const value = (result.stdout ?? '').trim();
    return { executed: true, value: value || undefined };
  } catch {
    return { executed: false, value: undefined };
  }
}

function executeWithDefaultShell(command: string): string | undefined {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output.trim() || undefined;
  } catch {
    return undefined;
  }
}

function executeCommandUncached(commandConfig: string): string | undefined {
  const command = commandConfig.slice(1);
  return process.platform === 'win32'
    ? (() => {
        const configured = executeWithConfiguredShell(command);
        return configured.executed ? configured.value : executeWithDefaultShell(command);
      })()
    : executeWithDefaultShell(command);
}

function executeCommand(commandConfig: string): string | undefined {
  if (commandResultCache.has(commandConfig)) {
    return commandResultCache.get(commandConfig);
  }
  const result = executeCommandUncached(commandConfig);
  commandResultCache.set(commandConfig, result);
  return result;
}

/**
 * Resolve without cache (for validation at startup)
 */
export function resolveConfigValueUncached(config: string): string | undefined {
  if (config.startsWith('!')) {
    return executeCommandUncached(config);
  }
  const envValue = process.env[config];
  return envValue || config;
}

/**
 * Resolve or throw if not found
 */
export function resolveConfigValueOrThrow(config: string, description: string): string {
  const value = resolveConfigValueUncached(config);
  if (!value) {
    throw new Error(`Missing required ${description}: ${config}`);
  }
  return value;
}

/**
 * Resolve to number
 */
export function resolveConfigValueToNumber(
  config: string,
  description: string,
  fallback?: number
): number | undefined {
  const resolved = resolveConfigValue(config);
  if (resolved === undefined) return fallback;
  const num = Number(resolved);
  return Number.isNaN(num) ? fallback : num;
}

/**
 * Resolve to boolean
 */
export function resolveConfigValueToBoolean(
  config: string,
  description: string,
  fallback?: boolean
): boolean | undefined {
  const resolved = resolveConfigValue(config);
  if (resolved === undefined) return fallback;
  const lower = resolved.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on') return true;
  if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off') return false;
  return fallback;
}

/**
 * Resolve to list (comma-separated)
 */
export function resolveConfigValueToList(
  config: string,
  description: string,
  delimiter: string = ','
): string[] {
  const resolved = resolveConfigValue(config);
  if (!resolved) return [];
  return resolved.split(delimiter).map(s => s.trim()).filter(Boolean);
}
