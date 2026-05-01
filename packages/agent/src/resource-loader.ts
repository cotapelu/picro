// SPDX-License-Identifier: Apache-2.0
/**
 * Resource Loader - Load extensions, skills, prompts, themes, context files
 *
 * This is a stub implementation - full implementation coming in Phase B
 */

import type { AgentMessage } from "./agent-types.js";
import type { Skill } from "./skills.js";
import { loadSkills } from "./skills.js";
import { loadPromptTemplates } from "./prompt-templates.js";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { discoverAndLoadExtensions } from "./extensions/loader.js";
import { createExtensionRuntime } from "./extensions/runner.js";
import { ExtensionRunner } from "./extensions/runner.js";

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
  private _agentsFilesCache?: Array<{ path: string; content: string }>;
  private _extensionsResult?: LoadExtensionsResult;
  private _extensionRunner?: any;

  constructor(options: {
    cwd: string;
    agentDir: string;
    settingsManager?: any;
  }) {
    this._cwd = options.cwd;
    this._agentDir = options.agentDir;
    // Initialize with empty defaults
    this._extensionsResult = { extensions: [], errors: [], runtime: createExtensionRuntime() };
    this._extensionRunner = new ExtensionRunner(this._extensionsResult.runtime);
    this._extensionRunner.loadExtensions(this._extensionsResult);
  }

  getExtensions(): LoadExtensionsResult {
    return {
      extensions: [],
      errors: [],
      runtime: {
        flagValues: new Map(),
        pendingProviderRegistrations: [],
      },
    };
  }

  getSkills(): { skills: Skill[]; diagnostics: ResourceDiagnostic[] } {
    if (this._skillsCache === undefined) {
      this._skillsCache = loadSkills({ cwd: this._cwd, agentDir: this._agentDir, includeDefaults: true });
    }
    return { skills: this._skillsCache, diagnostics: [] };
  }

  getPrompts(): { prompts: any[]; diagnostics: ResourceDiagnostic[] } {
    if (this._promptsCache === undefined) {
      this._promptsCache = loadPromptTemplates({ cwd: this._cwd, agentDir: this._agentDir, promptPaths: [], includeDefaults: true });
    }
    return { prompts: this._promptsCache, diagnostics: [] };
  }

  getThemes(): { themes: Theme[]; diagnostics: ResourceDiagnostic[] } {
    return { themes: [], diagnostics: [] };
  }

  getAgentsFiles(): { agentsFiles: Array<{ path: string; content: string }> } {
    if (this._agentsFilesCache === undefined) {
      this._agentsFilesCache = loadProjectContextFiles({ cwd: this._cwd, agentDir: this._agentDir });
    }
    return { agentsFiles: this._agentsFilesCache };
  }

  getSystemPrompt(): string | undefined {
    return undefined;
  }

  getAppendSystemPrompt(): string[] {
    return [];
  }

  async reload(): Promise<void> {
    // Reload all resources from disk
    this._skillsCache = loadSkills({ cwd: this._cwd, agentDir: this._agentDir, includeDefaults: true });
    this._promptsCache = loadPromptTemplates({ cwd: this._cwd, agentDir: this._agentDir, promptPaths: [], includeDefaults: true });
    this._agentsFilesCache = loadProjectContextFiles({ cwd: this._cwd, agentDir: this._agentDir });
    // Reload extensions
    try {
      this._extensionsResult = await discoverAndLoadExtensions({ cwd: this._cwd, agentDir: this._agentDir });
      this._extensionRunner = new ExtensionRunner(this._extensionsResult.runtime);
      this._extensionRunner.loadExtensions(this._extensionsResult);
    } catch {
      this._extensionsResult = { extensions: [], errors: [], runtime: createExtensionRuntime() };
      this._extensionRunner = new ExtensionRunner(this._extensionsResult.runtime);
      this._extensionRunner.loadExtensions(this._extensionsResult);
    }
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