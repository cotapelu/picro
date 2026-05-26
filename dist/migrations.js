"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Startup migrations for upgrading from older versions.
 * These are safe to run on every startup; they skip if already done.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateAuthToAuthJson = migrateAuthToAuthJson;
exports.migrateSessionsFromAgentRoot = migrateSessionsFromAgentRoot;
exports.migrateCommandsToPrompts = migrateCommandsToPrompts;
exports.runMigrations = runMigrations;
exports.showDeprecationWarnings = showDeprecationWarnings;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const config_js_1 = require("./config.js");
/**
 * Migrate legacy oauth.json and settings.json apiKeys to auth.json.
 * Returns list of provider names that were migrated.
 */
function migrateAuthToAuthJson() {
    const agentDir = (0, config_js_1.getAgentDir)();
    const authPath = (0, node_path_1.join)(agentDir, "auth.json");
    const oauthPath = (0, node_path_1.join)(agentDir, "oauth.json");
    const settingsPath = (0, node_path_1.join)(agentDir, "settings.json");
    if ((0, node_fs_1.existsSync)(authPath))
        return [];
    const migrated = {};
    const providers = [];
    // Migrate oauth.json
    if ((0, node_fs_1.existsSync)(oauthPath)) {
        try {
            const oauth = JSON.parse((0, node_fs_1.readFileSync)(oauthPath, "utf-8"));
            for (const [provider, cred] of Object.entries(oauth)) {
                migrated[provider] = { type: "oauth", ...cred };
                providers.push(provider);
            }
            (0, node_fs_1.renameSync)(oauthPath, `${oauthPath}.migrated`);
        }
        catch {
            // ignore errors
        }
    }
    // Migrate settings.json apiKeys
    if ((0, node_fs_1.existsSync)(settingsPath)) {
        try {
            const content = (0, node_fs_1.readFileSync)(settingsPath, "utf-8");
            const settings = JSON.parse(content);
            if (settings.apiKeys && typeof settings.apiKeys === "object") {
                for (const [provider, key] of Object.entries(settings.apiKeys)) {
                    if (!migrated[provider] && typeof key === "string") {
                        migrated[provider] = { type: "api_key", key };
                        providers.push(provider);
                    }
                }
                delete settings.apiKeys;
                (0, node_fs_1.writeFileSync)(settingsPath, JSON.stringify(settings, null, 2));
            }
        }
        catch {
            // ignore errors
        }
    }
    if (Object.keys(migrated).length > 0) {
        (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(authPath), { recursive: true });
        (0, node_fs_1.writeFileSync)(authPath, JSON.stringify(migrated, null, 2), { mode: 0o600 });
    }
    return providers;
}
/**
 * Migrate sessions from ~/.pi/agent/*.jsonl to proper session directories.
 * This fixes bug where sessions were saved in agent root instead of sessions/<cwd-hash>/.
 */
function migrateSessionsFromAgentRoot() {
    const agentDir = (0, config_js_1.getAgentDir)();
    let files;
    try {
        files = (0, node_fs_1.readdirSync)(agentDir)
            .filter((f) => f.endsWith(".jsonl"))
            .map((f) => (0, node_path_1.join)(agentDir, f));
    }
    catch {
        return 0;
    }
    if (files.length === 0)
        return 0;
    let moved = 0;
    for (const file of files) {
        try {
            const content = (0, node_fs_1.readFileSync)(file, "utf8");
            const firstLine = content.split("\n")[0];
            if (!firstLine?.trim())
                continue;
            const header = JSON.parse(firstLine);
            if (header.type !== "session" || !header.cwd)
                continue;
            const cwd = header.cwd;
            const safePath = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
            const correctDir = (0, node_path_1.join)(agentDir, "sessions", safePath);
            if (!(0, node_fs_1.existsSync)(correctDir)) {
                (0, node_fs_1.mkdirSync)(correctDir, { recursive: true });
            }
            const fileName = file.split("/").pop() || file.split("\\").pop();
            const newPath = (0, node_path_1.join)(correctDir, fileName);
            if ((0, node_fs_1.existsSync)(newPath))
                continue;
            (0, node_fs_1.renameSync)(file, newPath);
            moved++;
        }
        catch {
            // skip problematic files
        }
    }
    return moved;
}
/**
 * Migrate commands/ to prompts/ if needed.
 */
function migrateCommandsToPrompts(baseDir, label) {
    const commandsDir = (0, node_path_1.join)(baseDir, "commands");
    const promptsDir = (0, node_path_1.join)(baseDir, "prompts");
    if ((0, node_fs_1.existsSync)(commandsDir) && !(0, node_fs_1.existsSync)(promptsDir)) {
        try {
            (0, node_fs_1.renameSync)(commandsDir, promptsDir);
            return true;
        }
        catch {
            return false;
        }
    }
    return false;
}
/**
 * Run all migrations.
 * Returns list of provider names that were migrated (for auth) and warnings.
 */
function runMigrations(_cwd) {
    const migratedAuthProviders = [];
    const deprecationWarnings = [];
    // Auth migration
    try {
        const authMigrated = migrateAuthToAuthJson();
        if (authMigrated.length > 0) {
            migratedAuthProviders.push(...authMigrated);
        }
    }
    catch { }
    // Session migration
    try {
        const sessionsMoved = migrateSessionsFromAgentRoot();
        if (sessionsMoved > 0) {
            deprecationWarnings.push(`Migrated ${sessionsMoved} session(s) to proper directories.`);
        }
    }
    catch { }
    // Commands -> Prompts migration (global agent dir)
    try {
        const agentDir = (0, config_js_1.getAgentDir)();
        if (migrateCommandsToPrompts(agentDir, "global")) {
            deprecationWarnings.push("Migrated global commands/ to prompts/.");
        }
    }
    catch { }
    return { migratedAuthProviders, deprecationWarnings };
}
/**
 * Show deprecation warnings in interactive mode.
 */
async function showDeprecationWarnings(warnings) {
    if (warnings.length === 0)
        return;
    for (const w of warnings) {
        console.warn(`⚠️  ${w}`);
    }
}
//# sourceMappingURL=migrations.js.map