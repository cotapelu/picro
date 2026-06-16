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
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { discoverAndLoadExtensions } from "../extensions/loader.js";
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
}

/**
 * Load project context files (AGENTS.md, CLAUDE.md)
 */
export function loadProjectContextFiles(options: {
  cwd: string;
  agentDir: string;
}): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  const pathsToCheck = [
    join(options.agentDir, "AGENTS.md"),
    join(options.agentDir, "CLAUDE.md"),
    join(options.cwd, ".pi", "AGENTS.md"),
    join(options.cwd, ".pi", "CLAUDE.md"),
  ];
  for (const path of pathsToCheck) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, "utf8");
        files.push({ path, content });
      } catch {
        // ignore read errors
      }
    }
  }
  return files;
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