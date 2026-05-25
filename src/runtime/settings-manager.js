// SPDX-License-Identifier: Apache-2.0
/**
 * Settings Manager - Quản lý settings với file locking
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Global vs Project scope
 * - File locking với proper-lockfile
 * - Deep merge settings
 * - Async flush queue
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, closeSync, unlinkSync } from "node:fs";
import { validateOrThrow } from "../runtime/settings-validator.js";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
// ============================================================================
// Deep Merge
// ============================================================================
function deepMergeSettings(base, overrides) {
    const result = { ...base };
    for (const key of Object.keys(overrides)) {
        const overrideValue = overrides[key];
        const baseValue = base[key];
        if (overrideValue === undefined) {
            continue;
        }
        if (typeof overrideValue === "object" &&
            overrideValue !== null &&
            !Array.isArray(overrideValue) &&
            typeof baseValue === "object" &&
            baseValue !== null &&
            !Array.isArray(baseValue)) {
            result[key] = { ...baseValue, ...overrideValue };
        }
        else {
            result[key] = overrideValue;
        }
    }
    return result;
}
class FileSettingsStorage {
    globalSettingsPath;
    projectSettingsPath;
    constructor(cwd, agentDir) {
        this.globalSettingsPath = join(agentDir, "settings.json");
        this.projectSettingsPath = join(cwd, ".pi", "settings.json");
    }
    withLock(scope, fn) {
        const path = scope === "global" ? this.globalSettingsPath : this.projectSettingsPath;
        const lockPath = path + ".lock";
        const dir = dirname(path);
        const acquireLock = () => {
            try {
                const fd = openSync(lockPath, "wx");
                // Write PID
                try {
                    writeFileSync(lockPath, `${process.pid}\n`);
                }
                catch { }
                return fd;
            }
            catch (err) {
                if (err.code === "EEXIST") {
                    // Check for stale lock
                    try {
                        const pidStr = readFileSync(lockPath, "utf8").trim();
                        const pid = parseInt(pidStr, 10);
                        if (!isNaN(pid)) {
                            try {
                                process.kill(pid, 0); // test if process exists
                            }
                            catch {
                                // Stale lock, remove it
                                unlinkSync(lockPath);
                                return acquireLock();
                            }
                        }
                    }
                    catch {
                        // ignore read errors
                    }
                }
                return undefined;
            }
        };
        const maxRetries = 5;
        let lockFd;
        for (let i = 0; i < maxRetries; i++) {
            lockFd = acquireLock();
            if (lockFd !== undefined)
                break;
            // Retry after delay
            const delay = 50 * (i + 1);
            const start = Date.now();
            while (Date.now() - start < delay) { }
        }
        if (lockFd === undefined) {
            throw new Error(`Failed to acquire lock for settings: ${path}`);
        }
        try {
            const fileExists = existsSync(path);
            const current = fileExists ? readFileSync(path, "utf-8") : undefined;
            const next = fn(current);
            if (next !== undefined) {
                if (!existsSync(dir)) {
                    mkdirSync(dir, { recursive: true });
                }
                writeFileSync(path, next, "utf-8");
            }
        }
        finally {
            closeSync(lockFd);
            if (existsSync(lockPath)) {
                try {
                    unlinkSync(lockPath);
                }
                catch { }
            }
        }
    }
}
class InMemorySettingsStorage {
    global;
    project;
    withLock(scope, fn) {
        const current = scope === "global" ? this.global : this.project;
        const next = fn(current);
        if (next !== undefined) {
            if (scope === "global") {
                this.global = next;
            }
            else {
                this.project = next;
            }
        }
    }
}
// ============================================================================
// SettingsManager Class
// ============================================================================
export class SettingsManager {
    storage;
    globalSettings;
    projectSettings;
    settings;
    modifiedFields = new Set();
    modifiedNestedFields = new Map();
    modifiedProjectFields = new Set();
    modifiedProjectNestedFields = new Map();
    globalSettingsLoadError = null;
    projectSettingsLoadError = null;
    writeQueue = Promise.resolve();
    errors;
    changeListeners = [];
    constructor(storage, initialGlobal, initialProject, globalLoadError = null, projectLoadError = null, initialErrors = []) {
        this.storage = storage;
        this.globalSettings = initialGlobal;
        this.projectSettings = initialProject;
        this.globalSettingsLoadError = globalLoadError;
        this.projectSettingsLoadError = projectLoadError;
        this.errors = [...initialErrors];
        this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
    }
    static create(cwd, agentDir = join(homedir(), ".pi", "agent")) {
        const storage = new FileSettingsStorage(cwd, agentDir);
        return SettingsManager.fromStorage(storage);
    }
    static fromStorage(storage) {
        const globalLoad = SettingsManager.tryLoadFromStorage(storage, "global");
        const projectLoad = SettingsManager.tryLoadFromStorage(storage, "project");
        const initialErrors = [];
        if (globalLoad.error) {
            initialErrors.push({ scope: "global", error: globalLoad.error });
        }
        if (projectLoad.error) {
            initialErrors.push({ scope: "project", error: projectLoad.error });
        }
        return new SettingsManager(storage, globalLoad.settings, projectLoad.settings, globalLoad.error, projectLoad.error, initialErrors);
    }
    static inMemory(settings = {}) {
        const storage = new InMemorySettingsStorage();
        storage.withLock("global", () => JSON.stringify(settings, null, 2));
        return SettingsManager.fromStorage(storage);
    }
    static loadFromStorage(storage, scope) {
        let content;
        storage.withLock(scope, (current) => {
            content = current;
            return undefined;
        });
        if (!content) {
            return {};
        }
        try {
            const parsed = JSON.parse(content);
            validateOrThrow(parsed);
            return parsed;
        }
        catch {
            return {};
        }
    }
    static tryLoadFromStorage(storage, scope) {
        try {
            return { settings: SettingsManager.loadFromStorage(storage, scope), error: null };
        }
        catch (error) {
            return { settings: {}, error: error };
        }
    }
    static migrateSettings(settings) {
        // Migrate queueMode -> steeringMode
        if ("queueMode" in settings && !("steeringMode" in settings)) {
            settings.steeringMode = settings.queueMode;
            delete settings.queueMode;
        }
        // Migrate legacy websockets boolean -> transport enum
        if (!("transport" in settings) && typeof settings.websockets === "boolean") {
            settings.transport = settings.websockets ? "websocket" : "sse";
            delete settings.websockets;
        }
        return settings;
    }
    getGlobalSettings() {
        return structuredClone(this.globalSettings);
    }
    getProjectSettings() {
        return structuredClone(this.projectSettings);
    }
    async reload() {
        await this.writeQueue;
        const globalLoad = SettingsManager.tryLoadFromStorage(this.storage, "global");
        if (!globalLoad.error) {
            this.globalSettings = globalLoad.settings;
            this.globalSettingsLoadError = null;
        }
        else {
            this.globalSettingsLoadError = globalLoad.error;
            this.recordError("global", globalLoad.error);
        }
        this.modifiedFields.clear();
        this.modifiedNestedFields.clear();
        this.modifiedProjectFields.clear();
        this.modifiedProjectNestedFields.clear();
        const projectLoad = SettingsManager.tryLoadFromStorage(this.storage, "project");
        if (!projectLoad.error) {
            this.projectSettings = projectLoad.settings;
            this.projectSettingsLoadError = null;
        }
        else {
            this.projectSettingsLoadError = projectLoad.error;
            this.recordError("project", projectLoad.error);
        }
        this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
    }
    applyOverrides(overrides) {
        this.settings = deepMergeSettings(this.settings, overrides);
    }
    markModified(field, nestedKey) {
        this.modifiedFields.add(field);
        if (nestedKey) {
            if (!this.modifiedNestedFields.has(field)) {
                this.modifiedNestedFields.set(field, new Set());
            }
            this.modifiedNestedFields.get(field).add(nestedKey);
        }
    }
    markProjectModified(field, nestedKey) {
        this.modifiedProjectFields.add(field);
        if (nestedKey) {
            if (!this.modifiedProjectNestedFields.has(field)) {
                this.modifiedProjectNestedFields.set(field, new Set());
            }
            this.modifiedProjectNestedFields.get(field).add(nestedKey);
        }
    }
    recordError(scope, error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        this.errors.push({ scope, error: normalizedError });
    }
    clearModifiedScope(scope) {
        if (scope === "global") {
            this.modifiedFields.clear();
            this.modifiedNestedFields.clear();
            return;
        }
        this.modifiedProjectFields.clear();
        this.modifiedProjectNestedFields.clear();
    }
    enqueueWrite(scope, task) {
        this.writeQueue = this.writeQueue
            .then(() => {
            task();
            this.clearModifiedScope(scope);
        })
            .catch((error) => {
            this.recordError(scope, error);
        });
    }
    cloneModifiedNestedFields(source) {
        const snapshot = new Map();
        for (const [key, value] of source.entries()) {
            snapshot.set(key, new Set(value));
        }
        return snapshot;
    }
    persistScopedSettings(scope, snapshotSettings, modifiedFields, modifiedNestedFields) {
        this.storage.withLock(scope, (current) => {
            const currentFileSettings = current
                ? SettingsManager.migrateSettings(JSON.parse(current))
                : {};
            const mergedSettings = { ...currentFileSettings };
            for (const field of modifiedFields) {
                const value = snapshotSettings[field];
                if (modifiedNestedFields.has(field) && typeof value === "object" && value !== null) {
                    const nestedModified = modifiedNestedFields.get(field);
                    const baseNested = currentFileSettings[field] ?? {};
                    const inMemoryNested = value;
                    const mergedNested = { ...baseNested };
                    for (const nestedKey of nestedModified) {
                        mergedNested[nestedKey] = inMemoryNested[nestedKey];
                    }
                    mergedSettings[field] = mergedNested;
                }
                else {
                    mergedSettings[field] = value;
                }
            }
            return JSON.stringify(mergedSettings, null, 2);
        });
        // Notify change listeners
        const changedFields = new Set(modifiedFields);
        for (const listener of this.changeListeners) {
            try {
                listener(scope, changedFields);
            }
            catch { }
        }
    }
    save() {
        this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
        if (this.globalSettingsLoadError) {
            return;
        }
        const snapshotGlobalSettings = structuredClone(this.globalSettings);
        const modifiedFields = new Set(this.modifiedFields);
        const modifiedNestedFields = this.cloneModifiedNestedFields(this.modifiedNestedFields);
        this.enqueueWrite("global", () => {
            this.persistScopedSettings("global", snapshotGlobalSettings, modifiedFields, modifiedNestedFields);
        });
    }
    saveProjectSettings(settings) {
        this.projectSettings = structuredClone(settings);
        this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
        if (this.projectSettingsLoadError) {
            return;
        }
        const snapshotProjectSettings = structuredClone(this.projectSettings);
        const modifiedFields = new Set(this.modifiedProjectFields);
        const modifiedNestedFields = this.cloneModifiedNestedFields(this.modifiedProjectNestedFields);
        this.enqueueWrite("project", () => {
            this.persistScopedSettings("project", snapshotProjectSettings, modifiedFields, modifiedNestedFields);
        });
    }
    async flush() {
        await this.writeQueue;
    }
    drainErrors() {
        const drained = [...this.errors];
        this.errors = [];
        return drained;
    }
    // ============================================================================
    // Getters/Setters
    // ============================================================================
    getLastChangelogVersion() {
        return this.settings.lastChangelogVersion;
    }
    setLastChangelogVersion(version) {
        this.globalSettings.lastChangelogVersion = version;
        this.markModified("lastChangelogVersion");
        this.save();
    }
    getSessionDir() {
        const sessionDir = this.settings.sessionDir;
        if (!sessionDir)
            return sessionDir;
        if (sessionDir === "~")
            return homedir();
        if (sessionDir.startsWith("~/"))
            return join(homedir(), sessionDir.slice(2));
        return sessionDir;
    }
    getDefaultProvider() {
        return this.settings.defaultProvider;
    }
    setDefaultProvider(provider) {
        this.globalSettings.defaultProvider = provider;
        this.markModified("defaultProvider");
        this.save();
    }
    getDefaultModel() {
        return this.settings.defaultModel;
    }
    setDefaultModel(modelId) {
        this.globalSettings.defaultModel = modelId;
        this.markModified("defaultModel");
        this.save();
    }
    getSteeringMode() {
        return this.settings.steeringMode || "one-at-a-time";
    }
    setSteeringMode(mode) {
        this.globalSettings.steeringMode = mode;
        this.markModified("steeringMode");
        this.save();
    }
    getFollowUpMode() {
        return this.settings.followUpMode || "one-at-a-time";
    }
    setFollowUpMode(mode) {
        this.globalSettings.followUpMode = mode;
        this.markModified("followUpMode");
        this.save();
    }
    getTheme() {
        return this.settings.theme;
    }
    setTheme(theme) {
        this.globalSettings.theme = theme;
        this.markModified("theme");
        this.save();
    }
    getDefaultThinkingLevel() {
        return this.settings.defaultThinkingLevel;
    }
    setDefaultThinkingLevel(level) {
        this.globalSettings.defaultThinkingLevel = level;
        this.markModified("defaultThinkingLevel");
        this.save();
    }
    getTransport() {
        return this.settings.transport ?? "sse";
    }
    setTransport(transport) {
        this.globalSettings.transport = transport;
        this.markModified("transport");
        this.save();
    }
    getCompactionEnabled() {
        return this.settings.compaction?.enabled ?? true;
    }
    setCompactionEnabled(enabled) {
        if (!this.globalSettings.compaction) {
            this.globalSettings.compaction = {};
        }
        this.globalSettings.compaction.enabled = enabled;
        this.markModified("compaction", "enabled");
        this.save();
    }
    getCompactionReserveTokens() {
        return this.settings.compaction?.reserveTokens ?? 16384;
    }
    getCompactionKeepRecentTokens() {
        return this.settings.compaction?.keepRecentTokens ?? 20000;
    }
    getCompactionSettings() {
        return {
            enabled: this.getCompactionEnabled(),
            reserveTokens: this.getCompactionReserveTokens(),
            keepRecentTokens: this.getCompactionKeepRecentTokens(),
        };
    }
    getBranchSummarySettings() {
        return {
            reserveTokens: this.settings.branchSummary?.reserveTokens ?? 16384,
            skipPrompt: this.settings.branchSummary?.skipPrompt ?? false,
        };
    }
    getRetryEnabled() {
        return this.settings.retry?.enabled ?? true;
    }
    setRetryEnabled(enabled) {
        if (!this.globalSettings.retry) {
            this.globalSettings.retry = {};
        }
        this.globalSettings.retry.enabled = enabled;
        this.markModified("retry", "enabled");
        this.save();
    }
    getRetrySettings() {
        return {
            enabled: this.getRetryEnabled(),
            maxRetries: this.settings.retry?.maxRetries ?? 3,
            baseDelayMs: this.settings.retry?.baseDelayMs ?? 2000,
            maxDelayMs: this.settings.retry?.maxDelayMs ?? 60000,
        };
    }
    getHideThinkingBlock() {
        return this.settings.hideThinkingBlock ?? false;
    }
    setHideThinkingBlock(hide) {
        this.globalSettings.hideThinkingBlock = hide;
        this.markModified("hideThinkingBlock");
        this.save();
    }
    getShellPath() {
        return this.settings.shellPath;
    }
    setShellPath(path) {
        this.globalSettings.shellPath = path;
        this.markModified("shellPath");
        this.save();
    }
    getQuietStartup() {
        return this.settings.quietStartup ?? false;
    }
    setQuietStartup(quiet) {
        this.globalSettings.quietStartup = quiet;
        this.markModified("quietStartup");
        this.save();
    }
    getShellCommandPrefix() {
        return this.settings.shellCommandPrefix;
    }
    setShellCommandPrefix(prefix) {
        this.globalSettings.shellCommandPrefix = prefix;
        this.markModified("shellCommandPrefix");
        this.save();
    }
    getEnableInstallTelemetry() {
        return this.settings.enableInstallTelemetry ?? true;
    }
    setEnableInstallTelemetry(enabled) {
        this.globalSettings.enableInstallTelemetry = enabled;
        this.markModified("enableInstallTelemetry");
        this.save();
    }
    getPackages() {
        return [...(this.settings.packages ?? [])];
    }
    setPackages(packages) {
        this.globalSettings.packages = packages;
        this.markModified("packages");
        this.save();
    }
    getExtensionPaths() {
        return [...(this.settings.extensions ?? [])];
    }
    setExtensionPaths(paths) {
        this.globalSettings.extensions = paths;
        this.markModified("extensions");
        this.save();
    }
    getSkillPaths() {
        return [...(this.settings.skills ?? [])];
    }
    setSkillPaths(paths) {
        this.globalSettings.skills = paths;
        this.markModified("skills");
        this.save();
    }
    getEnableSkillCommands() {
        return this.settings.enableSkillCommands ?? true;
    }
    setEnableSkillCommands(enabled) {
        this.globalSettings.enableSkillCommands = enabled;
        this.markModified("enableSkillCommands");
        this.save();
    }
    getShowImages() {
        return this.settings.terminal?.showImages ?? true;
    }
    setShowImages(show) {
        if (!this.globalSettings.terminal) {
            this.globalSettings.terminal = {};
        }
        this.globalSettings.terminal.showImages = show;
        this.markModified("terminal", "showImages");
        this.save();
    }
    getImageWidthCells() {
        const width = this.settings.terminal?.imageWidthCells;
        if (typeof width !== "number" || !Number.isFinite(width)) {
            return 60;
        }
        return Math.max(1, Math.floor(width));
    }
    setImageWidthCells(width) {
        if (!this.globalSettings.terminal) {
            this.globalSettings.terminal = {};
        }
        this.globalSettings.terminal.imageWidthCells = Math.max(1, Math.floor(width));
        this.markModified("terminal", "imageWidthCells");
        this.save();
    }
    getEnabledModels() {
        return this.settings.enabledModels;
    }
    setEnabledModels(patterns) {
        this.globalSettings.enabledModels = patterns;
        this.markModified("enabledModels");
        this.save();
    }
    getDoubleEscapeAction() {
        return this.settings.doubleEscapeAction ?? "tree";
    }
    setDoubleEscapeAction(action) {
        this.globalSettings.doubleEscapeAction = action;
        this.markModified("doubleEscapeAction");
        this.save();
    }
    getThinkingBudgets() {
        return this.settings.thinkingBudgets;
    }
    getCodeBlockIndent() {
        return this.settings.markdown?.codeBlockIndent ?? "  ";
    }
    onChange(listener) {
        this.changeListeners.push(listener);
        return () => {
            this.changeListeners = this.changeListeners.filter(l => l !== listener);
        };
    }
}
//# sourceMappingURL=settings-manager.js.map