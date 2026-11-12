// SPDX-License-Identifier: Apache-2.0
/**
 * Resource Loader - Load extensions, skills, prompts, themes, context files
 *
 * This is a stub implementation - full implementation coming in Phase B
 */

import type { AgentMessage } from "../session/agent-types.js";
import type { Skill } from "./skills.js";
import { loadSkills } from "./skills.js";
import { loadPromptTemplates } from "./prompt-templates.js";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { discoverAndLoadExtensions } from "../extensions/loader.js";
import { stripBom } from "./frontmatter.js";
import { createExtensionRuntime } from "../extensions/runner.js";
import { ExtensionRunner } from "../extensions/runner.js";

/**
 * Resource loader interface for loading external resources
 */
export interface ResourceLoader {
  /** Get loaded extensions */
  getExtensions(): LoadExtensionsResult;

  /** Get loaded skills */
  getSkills(): { skills: Skill[]; diagnostics: ResourceDiagnostic[] };

  /** Get loaded prompt templates */
  getPrompts(): { prompts: LoadedPromptTemplate[]; diagnostics: ResourceDiagnostic[] };

  /** Get loaded themes */
  getThemes(): { themes: Theme[]; diagnostics: ResourceDiagnostic[] };

  /** Get AGENTS.md/CLAUDE.md context files */
  getAgentsFiles(): { agentsFiles: Array<{ path: string; content: string }> };

  /** Get system prompt */
  getSystemPrompt(): string | undefined;

  /** Get append system prompt */
  getAppendSystemPrompt(): string[];

  /** Reload all resources */
  reload(): Promise<void>;
}

/**
 * Extension types
 */
export interface Extension {
  name: string;
  path: string;
  tools: Map<string, any>;
  commands: Map<string, any>;
  flags: Map<string, { type: "boolean" | "string" }>;
  sourceInfo?: SourceInfo;
}

export interface LoadExtensionsResult {
  extensions: Extension[];
  errors: Array<{ path: string; error: string }>;
  runtime: ExtensionRuntime;
}

export interface ExtensionRuntime {
  flagValues: Map<string, boolean | string>;
  pendingProviderRegistrations: Array<{
    name: string;
    config: any;
    extensionPath: string;
  }>;
}

/**
 * Resource diagnostic
 */
export interface ResourceDiagnostic {
  type: "info" | "warning" | "error" | "collision";
  message: string;
  path?: string;
  collision?: {
    resourceType: "skill" | "prompt" | "theme" | "extension";
    name: string;
    winnerPath: string;
    loserPath: string;
  };
}

/**
 * Source information
 */
export interface SourceInfo {
  path: string;
  source: "local" | "builtin" | "extension" | "temporary";
  scope: "user" | "project" | "temporary";
  origin: "top-level" | "package";
  baseDir?: string;
}

/**
 * Prompt template
 */
export interface LoadedPromptTemplate {
  name: string;
  description?: string;
  filePath: string;
  template: string;
  sourceInfo?: SourceInfo;
}

/**
 * Theme
 */
export interface Theme {
  name: string;
  sourcePath?: string;
  sourceInfo?: SourceInfo;
  // Theme properties would be defined here
  [key: string]: any;
}

/**
 * Default resource loader implementation
 */
export class DefaultResourceLoader implements ResourceLoader {
  private _cwd: string;
  private _agentDir: string;
  private _skillsCache?: Skill[];
  private _promptsCache?: any[]; // PromptTemplate[]
  private _themesCache?: Theme[];
  private _agentsFilesCache?: Array<{ path: string; content: string }>;
  private _extensionsResult?: LoadExtensionsResult;
  private _extensionRunner?: any;
  private _systemPrompt?: string;
  private _appendSystemPrompt: string[] = [];

  constructor(options: {
    cwd: string;
    agentDir: string;
    settingsManager?: any;
    additionalExtensionPaths?: string[];
    additionalSkillPaths?: string[];
    additionalPromptTemplatePaths?: string[];
    additionalThemePaths?: string[];
    noExtensions?: boolean;
    noSkills?: boolean;
    noPromptTemplates?: boolean;
    noThemes?: boolean;
    noContextFiles?: boolean;
    systemPrompt?: string;
    appendSystemPrompt?: string[];
    // Override functions for testing
    extensionsOverride?: (base: LoadExtensionsResult) => LoadExtensionsResult;
    skillsOverride?: (base: { skills: Skill[]; diagnostics: ResourceDiagnostic[] }) => { skills: Skill[]; diagnostics: ResourceDiagnostic[] };
    promptsOverride?: (base: { prompts: any[]; diagnostics: ResourceDiagnostic[] }) => { prompts: any[]; diagnostics: ResourceDiagnostic[] };
    themesOverride?: (base: { themes: Theme[]; diagnostics: ResourceDiagnostic[] }) => { themes: Theme[]; diagnostics: ResourceDiagnostic[] };
    agentsFilesOverride?: (base: Array<{ path: string; content: string }>) => Array<{ path: string; content: string }>;
    systemPromptOverride?: (base: string | undefined) => string | undefined;
    appendSystemPromptOverride?: (base: string[]) => string[];
  }) {
    this._cwd = options.cwd;
    this._agentDir = options.agentDir;
    // Store options for reload
    this._options = options;
  }

  private _options: any;
  private _initialized = false;

  async reload(): Promise<void> {
    // Load extensions
    let extensionsResult: LoadExtensionsResult;
    if (this._options.noExtensions) {
      extensionsResult = { extensions: [], errors: [], runtime: createExtensionRuntime() };
    } else {
      try {
        extensionsResult = await discoverAndLoadExtensions({
          cwd: this._cwd,
          agentDir: this._agentDir,
          additionalPaths: this._options.additionalExtensionPaths,
        });
      } catch (error) {
        extensionsResult = { extensions: [], errors: [{
          path: 'discoverAndLoadExtensions',
          error: error instanceof Error ? error.message : String(error)
        }], runtime: createExtensionRuntime() };
      }
    }

    // Apply override if provided
    if (this._options.extensionsOverride) {
      extensionsResult = this._options.extensionsOverride(extensionsResult);
    }

    this._extensionsResult = extensionsResult;
    this._extensionRunner = new ExtensionRunner(extensionsResult.runtime);
    this._extensionRunner.loadExtensions(extensionsResult);

    // Load skills
    if (this._options.noSkills) {
      this._skillsCache = [];
    } else {
      let skills = loadSkills({
        cwd: this._cwd,
        agentDir: this._agentDir,
        skillPaths: this._options.additionalSkillPaths ?? [],
        includeDefaults: true,
      });
      if (this._options.skillsOverride) {
        const result = this._options.skillsOverride({ skills, diagnostics: [] });
        skills = result.skills;
      }
      this._skillsCache = skills;
    }

    // Load prompt templates
    if (this._options.noPromptTemplates) {
      this._promptsCache = [];
    } else {
      let prompts = loadPromptTemplates({
        cwd: this._cwd,
        agentDir: this._agentDir,
        promptPaths: this._options.additionalPromptTemplatePaths ?? [],
        includeDefaults: true,
      });
      if (this._options.promptsOverride) {
        const result = this._options.promptsOverride({ prompts, diagnostics: [] });
        prompts = result.prompts;
      }
      this._promptsCache = prompts;
    }

    // Load themes
    if (this._options.noThemes) {
      this._themesCache = [];
    } else {
      let themesResult = loadThemes({
        cwd: this._cwd,
        agentDir: this._agentDir,
        themePaths: this._options.additionalThemePaths ?? [],
        includeDefaults: true,
      });
      if (this._options.themesOverride) {
        themesResult = this._options.themesOverride(themesResult);
      }
      this._themesCache = themesResult.themes;
    }

    // Load context files (AGENTS.md, CLAUDE.md)
    if (this._options.noContextFiles) {
      this._agentsFilesCache = [];
    } else {
      let agentsFiles = loadProjectContextFiles({ cwd: this._cwd, agentDir: this._agentDir });
      if (this._options.agentsFilesOverride) {
        agentsFiles = this._options.agentsFilesOverride(agentsFiles);
      }
      this._agentsFilesCache = agentsFiles;
    }

    // System prompt
    this._systemPrompt = this._options.systemPrompt;
    this._appendSystemPrompt = this._options.appendSystemPrompt ?? [];

    // Apply overrides
    if (this._options.systemPromptOverride) {
      this._systemPrompt = this._options.systemPromptOverride(this._systemPrompt);
    }
    if (this._options.appendSystemPromptOverride) {
      this._appendSystemPrompt = this._options.appendSystemPromptOverride(this._appendSystemPrompt);
    }

    this._initialized = true;
  }

  getExtensions(): LoadExtensionsResult {
    if (!this._initialized) {
      // Should have been reloaded by constructor
      return { extensions: [], errors: [], runtime: { flagValues: new Map(), pendingProviderRegistrations: [] } };
    }
    return this._extensionsResult!;
  }

  getSkills(): { skills: Skill[]; diagnostics: ResourceDiagnostic[] } {
    if (!this._initialized) {
      return { skills: [], diagnostics: [] };
    }
    return { skills: this._skillsCache ?? [], diagnostics: [] };
  }

  getPrompts(): { prompts: any[]; diagnostics: ResourceDiagnostic[] } {
    if (!this._initialized) {
      return { prompts: [], diagnostics: [] };
    }
    return { prompts: this._promptsCache ?? [], diagnostics: [] };
  }

  /** Alias for compatibility with AgentSession */
  get promptTemplates(): any[] {
    return this._promptsCache ?? [];
  }

  getThemes(): { themes: Theme[]; diagnostics: ResourceDiagnostic[] } {
    if (!this._initialized) {
      return { themes: [], diagnostics: [] };
    }
    return { themes: this._themesCache ?? [], diagnostics: [] };
  }

  getAgentsFiles(): { agentsFiles: Array<{ path: string; content: string }> } {
    if (!this._initialized) {
      return { agentsFiles: [] };
    }
    return { agentsFiles: this._agentsFilesCache ?? [] };
  }

  getSystemPrompt(): string | undefined {
    return this._systemPrompt;
  }

  getAppendSystemPrompt(): string[] {
    return this._appendSystemPrompt;
  }

  /**
   * Extend resources from extensions (skills, prompts, themes)
   */
  extendResources(paths: {
    skillPaths: Array<{ path: string; extensionPath: string }>;
    promptPaths: Array<{ path: string; extensionPath: string }>;
    themePaths: Array<{ path: string; extensionPath: string }>;
  }): void {
    // For now, simply reload all resources (simplified)
    // In full implementation, would selectively load only new resources
    if (paths.skillPaths.length > 0 || paths.promptPaths.length > 0 || paths.themePaths.length > 0) {
      // Mark need reload; next get* calls will use updated cache after reload
      // For simplicity, just call reload() to pick up new files
      this.reload().catch(console.error);
    }
  }
}

/**
 * Candidate names for a context file, in priority order.
 * Matches pi-mono's resource-loader so an override file can shadow the plain
 * one and both spellings of AGENTS/CLAUDE are accepted.
 */
const CONTEXT_FILE_CANDIDATES = ["AGENTS.override.md", "AGENTS.md", "AGENTS.MD", "CLAUDE.md", "CLAUDE.MD"];

/** First matching context file in a directory, or null. */
function loadContextFileFromDir(dir: string): { path: string; content: string } | null {
  for (const filename of CONTEXT_FILE_CANDIDATES) {
    const filePath = join(dir, filename);
    if (!existsSync(filePath)) continue;
    try {
      if (!statSync(filePath).isFile()) continue;
      return { path: filePath, content: stripBom(readFileSync(filePath, "utf8")) };
    } catch (error) {
      console.warn(`Warning: Could not read context file ${filePath}:`, error);
    }
  }
  return null;
}

/**
 * Load project context files (AGENTS.md, CLAUDE.md).
 *
 * Scope order (later entries win when the agent concatenates them):
 *   1. the agent directory (global scope),
 *   2. every ancestor of cwd from the filesystem root down to cwd.
 *
 * The previous implementation looked only at "<agentDir>/AGENTS.md" and
 * "<cwd>/.pi/AGENTS.md", so a project's own AGENTS.md at its root - the
 * documented location, and the whole point of the --no-context-files flag -
 * was never read, and neither were the AGENTS.md files of nested packages in a
 * monorepo.
 */
export function loadProjectContextFiles(options: {
  cwd: string;
  agentDir: string;
}): Array<{ path: string; content: string }> {
  const resolvedCwd = resolve(options.cwd);
  const resolvedAgentDir = resolve(options.agentDir);

  const contextFiles: Array<{ path: string; content: string }> = [];
  const seenPaths = new Set<string>();

  const addFile = (file: { path: string; content: string } | null): void => {
    if (!file || seenPaths.has(file.path)) return;
    seenPaths.add(file.path);
    contextFiles.push(file);
  };

  // Global scope.
  addFile(loadContextFileFromDir(resolvedAgentDir));

  // Every ancestor, root first so the nearest file is applied last.
  const ancestors: Array<{ path: string; content: string }> = [];
  const ancestorSeen = new Set<string>();
  let currentDir = resolvedCwd;
  while (true) {
    const file = loadContextFileFromDir(currentDir);
    if (file && !ancestorSeen.has(file.path)) {
      ancestorSeen.add(file.path);
      ancestors.unshift(file);
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  for (const file of ancestors) addFile(file);
  return contextFiles;
}

/**
 * Load themes from paths
 */
function loadThemes(options: {
  cwd: string;
  agentDir: string;
  themePaths?: string[];
  includeDefaults?: boolean;
}): { themes: Theme[]; diagnostics: ResourceDiagnostic[] } {
  // Stub: no built-in themes yet
  return { themes: [], diagnostics: [] };
}