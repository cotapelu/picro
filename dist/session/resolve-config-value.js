"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Resolve configuration values that may be shell commands, environment variables, or literals.
 * Moved from agent/ to session/ because it's used by auth-storage.
 *
 * Supports:
 * - "!command" - execute shell command and use stdout (cached)
 * - "ENV_VAR" - check environment variable, fallback to literal
 * - "literal" - use as-is
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveConfigValue = resolveConfigValue;
exports.resolveConfigValueUncached = resolveConfigValueUncached;
exports.resolveConfigValueOrThrow = resolveConfigValueOrThrow;
exports.resolveConfigValueToNumber = resolveConfigValueToNumber;
exports.resolveConfigValueToBoolean = resolveConfigValueToBoolean;
exports.resolveConfigValueToList = resolveConfigValueToList;
const child_process_1 = require("child_process");
const shell_js_1 = require("../utils/shell.js");
// Cache for shell command results (process lifetime)
const commandResultCache = new Map();
/**
 * Resolve a config value.
 * - If starts with "!", executes as shell command (cached)
 * - Otherwise checks env var, then uses literal
 */
function resolveConfigValue(config) {
    if (config.startsWith('!')) {
        return executeCommand(config);
    }
    const envValue = process.env[config];
    return envValue || config;
}
function executeWithConfiguredShell(command) {
    try {
        const { shell, args } = (0, shell_js_1.getShellConfig)();
        const result = (0, child_process_1.spawnSync)(shell, [...args, command], {
            encoding: 'utf-8',
            timeout: 10000,
            stdio: ['ignore', 'pipe', 'ignore'],
            shell: false,
            windowsHide: true,
        });
        if (result.error) {
            const err = result.error;
            if (err.code === 'ENOENT')
                return { executed: false, value: undefined };
            return { executed: true, value: undefined };
        }
        if (result.status !== 0)
            return { executed: true, value: undefined };
        const value = (result.stdout ?? '').trim();
        return { executed: true, value: value || undefined };
    }
    catch {
        return { executed: false, value: undefined };
    }
}
function executeWithDefaultShell(command) {
    try {
        const output = (0, child_process_1.execSync)(command, {
            encoding: 'utf-8',
            timeout: 10000,
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return output.trim() || undefined;
    }
    catch {
        return undefined;
    }
}
function executeCommandUncached(commandConfig) {
    const command = commandConfig.slice(1);
    return process.platform === 'win32'
        ? (() => {
            const configured = executeWithConfiguredShell(command);
            return configured.executed ? configured.value : executeWithDefaultShell(command);
        })()
        : executeWithDefaultShell(command);
}
function executeCommand(commandConfig) {
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
function resolveConfigValueUncached(config) {
    if (config.startsWith('!')) {
        return executeCommandUncached(config);
    }
    const envValue = process.env[config];
    return envValue || config;
}
/**
 * Resolve or throw if not found
 */
function resolveConfigValueOrThrow(config, description) {
    const value = resolveConfigValueUncached(config);
    if (!value) {
        throw new Error(`Missing required ${description}: ${config}`);
    }
    return value;
}
/**
 * Resolve to number
 */
function resolveConfigValueToNumber(config, description, fallback) {
    const resolved = resolveConfigValue(config);
    if (resolved === undefined)
        return fallback;
    const num = Number(resolved);
    return Number.isNaN(num) ? fallback : num;
}
/**
 * Resolve to boolean
 */
function resolveConfigValueToBoolean(config, description, fallback) {
    const resolved = resolveConfigValue(config);
    if (resolved === undefined)
        return fallback;
    const lower = resolved.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on')
        return true;
    if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off')
        return false;
    return fallback;
}
/**
 * Resolve to list (comma-separated)
 */
function resolveConfigValueToList(config, description, delimiter = ',') {
    const resolved = resolveConfigValue(config);
    if (!resolved)
        return [];
    return resolved.split(delimiter).map(s => s.trim()).filter(Boolean);
}
//# sourceMappingURL=resolve-config-value.js.map