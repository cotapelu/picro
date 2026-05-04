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
import { validateOrThrow } from "./settings-validator";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

// ============================================================================
// Types
// ============================================================================

export interface CompactionSettings {
  enabled?: boolean;
  reserveTokens?: number;
  keepRecentTokens?: number;
}

export interface BranchSummarySettings {
  reserveTokens?: number;
  skipPrompt?: boolean;
}

export interface RetrySettings {
  enabled?: boolean;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface TerminalSettings {
  showImages?: boolean;
  imageWidthCells?: number;
  clearOnShrink?: boolean;
  showTerminalProgress?: boolean;
}

export interface ImageSettings {
  autoResize?: boolean;
  blockImages?: boolean;
}

export interface ThinkingBudgetsSettings {
  minimal?: number;
  low?: number;
  medium?: number;
  high?: number;
}

export interface MarkdownSettings {
  codeBlockIndent?: string;
}

export type PackageSource = string | {
  source: string;
  extensions?: string[];
  skills?: string[];
  prompts?: string[];
  themes?: string[];
};

export interface Settings {
  lastChangelogVersion?: string;
  defaultProvider?: string;
  defaultModel?: string;
  defaultThinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  transport?: "sse" | "websocket" | "polling";
  steeringMode?: "all" | "one-at-a-time";
  followUpMode?: "all" | "one-at-a-time";
  theme?: string;
  compaction?: CompactionSettings;
  branchSummary?: BranchSummarySettings;
  retry?: RetrySettings;
  hideThinkingBlock?: boolean;
  shellPath?: string;
  quietStartup?: boolean;
  shellCommandPrefix?: string;
  npmCommand?: string[];
  collapseChangelog?: boolean;
  enableInstallTelemetry?: boolean;
  packages?: PackageSource[];
  extensions?: string[];
  skills?: string[];
  prompts?: string[];
  themes?: string[];
  enableSkillCommands?: boolean;
  terminal?: TerminalSettings;
  images?: ImageSettings;
  enabledModels?: string[];
  doubleEscapeAction?: "fork" | "tree" | "none";
  treeFilterMode?: "default" | "no-tools" | "user-only" | "labeled-only" | "all";
  thinkingBudgets?: ThinkingBudgetsSettings;
  editorPaddingX?: number;
  autocompleteMaxVisible?: number;
  showHardwareCursor?: boolean;
  markdown?: MarkdownSettings;
  sessionDir?: string;
}

export type SettingsScope = "global" | "project";

// ============================================================================
// Deep Merge
// ============================================================================

function deepMergeSettings(base: Settings, overrides: Settings): Settings {
  const result: Settings = { ...base };

  for (const key of Object.keys(overrides) as (keyof Settings)[]) {
    const overrideValue = overrides[key];
    const baseValue = base[key];

    if (overrideValue === undefined) {
      continue;
    }

    if (
      typeof overrideValue === "object" &&
      overrideValue !== null &&
      !Array.isArray(overrideValue) &&
      typeof baseValue === "object" &&
      baseValue !== null &&
      !Array.isArray(baseValue)
    ) {
      (result as Record<string, unknown>)[key] = { ...baseValue, ...overrideValue };
    } else {
      (result as Record<string, unknown>)[key] = overrideValue;
    }
  }

  return result;
}

// ============================================================================
// Storage Backend
// ============================================================================

export interface SettingsStorage {
  withLock(scope: SettingsScope, fn: (current: string | undefined) => string | undefined): void;
}

export interface SettingsError {
  scope: SettingsScope;
  error: Error;
}

class FileSettingsStorage implements SettingsStorage {
  private globalSettingsPath: string;
  private projectSettingsPath: string;

  constructor(cwd: string, agentDir: string) {
    this.globalSettingsPath = join(agentDir, "settings.json");
    this.projectSettingsPath = join(cwd, ".pi", "settings.json");
  }

  withLock(scope: SettingsScope, fn: (current: string | undefined) => string | undefined): void {
    const path = scope === "global" ? this.globalSettingsPath : this.projectSettingsPath;
    const lockPath = path + ".lock";
    const dir = dirname(path);

    const acquireLock = (): number | undefined => {
      try {
        const fd = openSync(lockPath, "wx");
        // Write PID
        try { writeFileSync(lockPath, `${process.pid}\n`); } catch {}
        return fd;
      } catch (err: any) {
        if (err.code === "EEXIST") {
          // Check for stale lock
          try {
            const pidStr = readFileSync(lockPath, "utf8").trim();
            const pid = parseInt(pidStr, 10);
            if (!isNaN(pid)) {
              try {
                process.kill(pid, 0); // test if process exists
              } catch {
                // Stale lock, remove it
                unlinkSync(lockPath);
                return acquireLock();
              }
            }
          } catch {
            // ignore read errors
          }
        }
        return undefined;
      }
    };

    const maxRetries = 5;
    let lockFd: number | undefined;
    for (let i = 0; i < maxRetries; i++) {
      lockFd = acquireLock();
      if (lockFd !== undefined) break;
      // Retry after delay
      const delay = 50 * (i + 1);
      const start = Date.now();
      while (Date.now() - start < delay) {}
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
    } finally {
      closeSync(lockFd);
      if (existsSync(lockPath)) {
        try { unlinkSync(lockPath); } catch {}
      }
    }
  }
}

class InMemorySettingsStorage implements SettingsStorage {
  private global: string | undefined;
  private project: string | undefined;

  withLock(scope: SettingsScope, fn: (current: string | undefined) => string | undefined): void {
    const current = scope === "global" ? this.global : this.project;
    const next = fn(current);
    if (next !== undefined) {
      if (scope === "global") {
        this.global = next;
      } else {
        this.project = next;
      }
    }
  }
}

// ============================================================================
// SettingsManager Class
// ============================================================================

export class SettingsManager {
  private storage: SettingsStorage;
  private globalSettings: Settings;
  private projectSettings: Settings;
  private settings: Settings;
  private modifiedFields = new Set<keyof Settings>();
  private modifiedNestedFields = new Map<keyof Settings, Set<string>>();
  private modifiedProjectFields = new Set<keyof Settings>();
  private modifiedProjectNestedFields = new Map<keyof Settings, Set<string>>();
  private globalSettingsLoadError: Error | null = null;
  private projectSettingsLoadError: Error | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private errors: SettingsError[];
  private changeListeners: Array<(scope: SettingsScope, fields: Set<keyof Settings>) => void> = [];

  private constructor(
    storage: SettingsStorage,
    initialGlobal: Settings,
    initialProject: Settings,
    globalLoadError: Error | null = null,
    projectLoadError: Error | null = null,
    initialErrors: SettingsError[] = []
  ) {
    this.storage = storage;
    this.globalSettings = initialGlobal;
    this.projectSettings = initialProject;
    this.globalSettingsLoadError = globalLoadError;
    this.projectSettingsLoadError = projectLoadError;
    this.errors = [...initialErrors];
    this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
  }

  static create(cwd: string, agentDir: string = join(homedir(), ".pi", "agent")): SettingsManager {
    const storage = new FileSettingsStorage(cwd, agentDir);
    return SettingsManager.fromStorage(storage);
  }

  static fromStorage(storage: SettingsStorage): SettingsManager {
    const globalLoad = SettingsManager.tryLoadFromStorage(storage, "global");
    const projectLoad = SettingsManager.tryLoadFromStorage(storage, "project");
    const initialErrors: SettingsError[] = [];
    if (globalLoad.error) {
      initialErrors.push({ scope: "global", error: globalLoad.error });
    }
    if (projectLoad.error) {
      initialErrors.push({ scope: "project", error: projectLoad.error });
    }

    return new SettingsManager(
      storage,
      globalLoad.settings,
      projectLoad.settings,
      globalLoad.error,
      projectLoad.error,
      initialErrors
    );
  }

  static inMemory(settings: Partial<Settings> = {}): SettingsManager {
    const storage = new InMemorySettingsStorage();
    storage.withLock("global", () => JSON.stringify(settings, null, 2));
    return SettingsManager.fromStorage(storage);
  }

  private static loadFromStorage(storage: SettingsStorage, scope: SettingsScope): Settings {
    let content: string | undefined;
    storage.withLock(scope, (current) => {
      content = current;
      return undefined;
    });

    if (!content) {
      return {};
    }
    try {
      const parsed = JSON.parse(content) as Settings;
      validateOrThrow(parsed);
      return parsed;
    } catch {
      return {};
    }
  }

  private static tryLoadFromStorage(
    storage: SettingsStorage,
    scope: SettingsScope
  ): { settings: Settings; error: Error | null } {
    try {
      return { settings: SettingsManager.loadFromStorage(storage, scope), error: null };
    } catch (error) {
      return { settings: {}, error: error as Error };
    }
  }

  private static migrateSettings(settings: Record<string, unknown>): Settings {
    // Migrate queueMode -> steeringMode
    if ("queueMode" in settings && !("steeringMode" in settings)) {
      settings.steeringMode = settings.queueMode as any;
      delete settings.queueMode;
    }

    // Migrate legacy websockets boolean -> transport enum
    if (!("transport" in settings) && typeof settings.websockets === "boolean") {
      settings.transport = settings.websockets ? "websocket" : "sse";
      delete settings.websockets;
    }

    return settings as Settings;
  }

  getGlobalSettings(): Settings {
    return structuredClone(this.globalSettings);
  }

  getProjectSettings(): Settings {
    return structuredClone(this.projectSettings);
  }

  async reload(): Promise<void> {
    await this.writeQueue;
    const globalLoad = SettingsManager.tryLoadFromStorage(this.storage, "global");
    if (!globalLoad.error) {
      this.globalSettings = globalLoad.settings;
      this.globalSettingsLoadError = null;
    } else {
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
    } else {
      this.projectSettingsLoadError = projectLoad.error;
      this.recordError("project", projectLoad.error);
    }

    this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
  }

  applyOverrides(overrides: Partial<Settings>): void {
    this.settings = deepMergeSettings(this.settings, overrides);
  }

  private markModified(field: keyof Settings, nestedKey?: string): void {
    this.modifiedFields.add(field);
    if (nestedKey) {
      if (!this.modifiedNestedFields.has(field)) {
        this.modifiedNestedFields.set(field, new Set());
      }
      this.modifiedNestedFields.get(field)!.add(nestedKey);
    }
  }

  private markProjectModified(field: keyof Settings, nestedKey?: string): void {
    this.modifiedProjectFields.add(field);
    if (nestedKey) {
      if (!this.modifiedProjectNestedFields.has(field)) {
        this.modifiedProjectNestedFields.set(field, new Set());
      }
      this.modifiedProjectNestedFields.get(field)!.add(nestedKey);
    }
  }

  private recordError(scope: SettingsScope, error: unknown): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    this.errors.push({ scope, error: normalizedError });
  }

  private clearModifiedScope(scope: SettingsScope): void {
    if (scope === "global") {
      this.modifiedFields.clear();
      this.modifiedNestedFields.clear();
      return;
    }
    this.modifiedProjectFields.clear();
    this.modifiedProjectNestedFields.clear();
  }

  private enqueueWrite(scope: SettingsScope, task: () => void): void {
    this.writeQueue = this.writeQueue
      .then(() => {
        task();
        this.clearModifiedScope(scope);
      })
      .catch((error) => {
        this.recordError(scope, error);
      });
  }

  private cloneModifiedNestedFields(source: Map<keyof Settings, Set<string>>): Map<keyof Settings, Set<string>> {
    const snapshot = new Map<keyof Settings, Set<string>>();
    for (const [key, value] of source.entries()) {
      snapshot.set(key, new Set(value));
    }
    return snapshot;
  }

  private persistScopedSettings(
    scope: SettingsScope,
    snapshotSettings: Settings,
    modifiedFields: Set<keyof Settings>,
    modifiedNestedFields: Map<keyof Settings, Set<string>>
  ): void {
    this.storage.withLock(scope, (current) => {
      const currentFileSettings = current
        ? SettingsManager.migrateSettings(JSON.parse(current) as Record<string, unknown>)
        : {};
      const mergedSettings: Settings = { ...currentFileSettings };

      for (const field of modifiedFields) {
        const value = snapshotSettings[field];
        if (modifiedNestedFields.has(field) && typeof value === "object" && value !== null) {
          const nestedModified = modifiedNestedFields.get(field)!;
          const baseNested = (currentFileSettings[field] as Record<string, unknown>) ?? {};
          const inMemoryNested = value as Record<string, unknown>;
          const mergedNested = { ...baseNested };
          for (const nestedKey of nestedModified) {
            mergedNested[nestedKey] = inMemoryNested[nestedKey];
          }
          (mergedSettings as Record<string, unknown>)[field] = mergedNested;
        } else {
          (mergedSettings as Record<string, unknown>)[field] = value;
        }
      }

      return JSON.stringify(mergedSettings, null, 2);
    });
    // Notify change listeners
    const changedFields = new Set(modifiedFields);
    for (const listener of this.changeListeners) {
      try { listener(scope, changedFields); } catch {}
    }
  }

  private save(): void {
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

  private saveProjectSettings(settings: Settings): void {
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

  async flush(): Promise<void> {
    await this.writeQueue;
  }

  drainErrors(): SettingsError[] {
    const drained = [...this.errors];
    this.errors = [];
    return drained;
  }

  // ============================================================================
  // Getters/Setters
  // ============================================================================

  getLastChangelogVersion(): string | undefined {
    return this.settings.lastChangelogVersion;
  }

  setLastChangelogVersion(version: string): void {
    this.globalSettings.lastChangelogVersion = version;
    this.markModified("lastChangelogVersion");
    this.save();
  }

  getSessionDir(): string | undefined {
    const sessionDir = this.settings.sessionDir;
    if (!sessionDir) return sessionDir;
    if (sessionDir === "~") return homedir();
    if (sessionDir.startsWith("~/")) return join(homedir(), sessionDir.slice(2));
    return sessionDir;
  }

  getDefaultProvider(): string | undefined {
    return this.settings.defaultProvider;
  }

  setDefaultProvider(provider: string): void {
    this.globalSettings.defaultProvider = provider;
    this.markModified("defaultProvider");
    this.save();
  }

  getDefaultModel(): string | undefined {
    return this.settings.defaultModel;
  }

  setDefaultModel(modelId: string): void {
    this.globalSettings.defaultModel = modelId;
    this.markModified("defaultModel");
    this.save();
  }

  getSteeringMode(): "all" | "one-at-a-time" {
    return this.settings.steeringMode || "one-at-a-time";
  }

  setSteeringMode(mode: "all" | "one-at-a-time"): void {
    this.globalSettings.steeringMode = mode;
    this.markModified("steeringMode");
    this.save();
  }

  getFollowUpMode(): "all" | "one-at-a-time" {
    return this.settings.followUpMode || "one-at-a-time";
  }

  setFollowUpMode(mode: "all" | "one-at-a-time"): void {
    this.globalSettings.followUpMode = mode;
    this.markModified("followUpMode");
    this.save();
  }

  getTheme(): string | undefined {
    return this.settings.theme;
  }

  setTheme(theme: string): void {
    this.globalSettings.theme = theme;
    this.markModified("theme");
    this.save();
  }

  getDefaultThinkingLevel(): "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | undefined {
    return this.settings.defaultThinkingLevel;
  }

  setDefaultThinkingLevel(level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh"): void {
    this.globalSettings.defaultThinkingLevel = level;
    this.markModified("defaultThinkingLevel");
    this.save();
  }

  getTransport(): "sse" | "websocket" | "polling" {
    return this.settings.transport ?? "sse";
  }

  setTransport(transport: "sse" | "websocket" | "polling"): void {
    this.globalSettings.transport = transport;
    this.markModified("transport");
    this.save();
  }

  getCompactionEnabled(): boolean {
    return this.settings.compaction?.enabled ?? true;
  }

  setCompactionEnabled(enabled: boolean): void {
    if (!this.globalSettings.compaction) {
      this.globalSettings.compaction = {};
    }
    this.globalSettings.compaction.enabled = enabled;
    this.markModified("compaction", "enabled");
    this.save();
  }

  getCompactionReserveTokens(): number {
    return this.settings.compaction?.reserveTokens ?? 16384;
  }

  getCompactionKeepRecentTokens(): number {
    return this.settings.compaction?.keepRecentTokens ?? 20000;
  }

  getCompactionSettings(): { enabled: boolean; reserveTokens: number; keepRecentTokens: number } {
    return {
      enabled: this.getCompactionEnabled(),
      reserveTokens: this.getCompactionReserveTokens(),
      keepRecentTokens: this.getCompactionKeepRecentTokens(),
    };
  }

  getBranchSummarySettings(): { reserveTokens: number; skipPrompt: boolean } {
    return {
      reserveTokens: this.settings.branchSummary?.reserveTokens ?? 16384,
      skipPrompt: this.settings.branchSummary?.skipPrompt ?? false,
    };
  }

  getRetryEnabled(): boolean {
    return this.settings.retry?.enabled ?? true;
  }

  setRetryEnabled(enabled: boolean): void {
    if (!this.globalSettings.retry) {
      this.globalSettings.retry = {};
    }
    this.globalSettings.retry.enabled = enabled;
    this.markModified("retry", "enabled");
    this.save();
  }

  getRetrySettings(): { enabled: boolean; maxRetries: number; baseDelayMs: number; maxDelayMs: number } {
    return {
      enabled: this.getRetryEnabled(),
      maxRetries: this.settings.retry?.maxRetries ?? 3,
      baseDelayMs: this.settings.retry?.baseDelayMs ?? 2000,
      maxDelayMs: this.settings.retry?.maxDelayMs ?? 60000,
    };
  }

  getHideThinkingBlock(): boolean {
    return this.settings.hideThinkingBlock ?? false;
  }

  setHideThinkingBlock(hide: boolean): void {
    this.globalSettings.hideThinkingBlock = hide;
    this.markModified("hideThinkingBlock");
    this.save();
  }

  getShellPath(): string | undefined {
    return this.settings.shellPath;
  }

  setShellPath(path: string | undefined): void {
    this.globalSettings.shellPath = path;
    this.markModified("shellPath");
    this.save();
  }

  getQuietStartup(): boolean {
    return this.settings.quietStartup ?? false;
  }

  setQuietStartup(quiet: boolean): void {
    this.globalSettings.quietStartup = quiet;
    this.markModified("quietStartup");
    this.save();
  }

  getShellCommandPrefix(): string | undefined {
    return this.settings.shellCommandPrefix;
  }

  setShellCommandPrefix(prefix: string | undefined): void {
    this.globalSettings.shellCommandPrefix = prefix;
    this.markModified("shellCommandPrefix");
    this.save();
  }

  getEnableInstallTelemetry(): boolean {
    return this.settings.enableInstallTelemetry ?? true;
  }

  setEnableInstallTelemetry(enabled: boolean): void {
    this.globalSettings.enableInstallTelemetry = enabled;
    this.markModified("enableInstallTelemetry");
    this.save();
  }

  getPackages(): PackageSource[] {
    return [...(this.settings.packages ?? [])];
  }

  setPackages(packages: PackageSource[]): void {
    this.globalSettings.packages = packages;
    this.markModified("packages");
    this.save();
  }

  getExtensionPaths(): string[] {
    return [...(this.settings.extensions ?? [])];
  }

  setExtensionPaths(paths: string[]): void {
    this.globalSettings.extensions = paths;
    this.markModified("extensions");
    this.save();
  }

  getSkillPaths(): string[] {
    return [...(this.settings.skills ?? [])];
  }

  setSkillPaths(paths: string[]): void {
    this.globalSettings.skills = paths;
    this.markModified("skills");
    this.save();
  }

  getEnableSkillCommands(): boolean {
    return this.settings.enableSkillCommands ?? true;
  }

  setEnableSkillCommands(enabled: boolean): void {
    this.globalSettings.enableSkillCommands = enabled;
    this.markModified("enableSkillCommands");
    this.save();
  }

  getShowImages(): boolean {
    return this.settings.terminal?.showImages ?? true;
  }

  setShowImages(show: boolean): void {
    if (!this.globalSettings.terminal) {
      this.globalSettings.terminal = {};
    }
    this.globalSettings.terminal.showImages = show;
    this.markModified("terminal", "showImages");
    this.save();
  }

  getImageWidthCells(): number {
    const width = this.settings.terminal?.imageWidthCells;
    if (typeof width !== "number" || !Number.isFinite(width)) {
      return 60;
    }
    return Math.max(1, Math.floor(width));
  }

  setImageWidthCells(width: number): void {
    if (!this.globalSettings.terminal) {
      this.globalSettings.terminal = {};
    }
    this.globalSettings.terminal.imageWidthCells = Math.max(1, Math.floor(width));
    this.markModified("terminal", "imageWidthCells");
    this.save();
  }

  getEnabledModels(): string[] | undefined {
    return this.settings.enabledModels;
  }

  setEnabledModels(patterns: string[] | undefined): void {
    this.globalSettings.enabledModels = patterns;
    this.markModified("enabledModels");
    this.save();
  }

  getDoubleEscapeAction(): "fork" | "tree" | "none" {
    return this.settings.doubleEscapeAction ?? "tree";
  }

  setDoubleEscapeAction(action: "fork" | "tree" | "none"): void {
    this.globalSettings.doubleEscapeAction = action;
    this.markModified("doubleEscapeAction");
    this.save();
  }

  getThinkingBudgets(): ThinkingBudgetsSettings | undefined {
    return this.settings.thinkingBudgets;
  }

  getCodeBlockIndent(): string {
    return this.settings.markdown?.codeBlockIndent ?? "  ";
  }

  onChange(listener: (scope: SettingsScope, fields: Set<keyof Settings>) => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }
}