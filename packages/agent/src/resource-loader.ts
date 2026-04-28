// SPDX-License-Identifier: Apache-2.0
/**
 * Resource Loader - Load extensions, skills, prompts, themes, context files
 *
 * This is a stub implementation - full implementation coming in Phase B
 */

import type { AgentMessage } from "./agent-types.js";
import type { Skill } from "./skills.js";

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
  constructor(options: {
    cwd: string;
    agentDir: string;
    settingsManager?: any;
  }) {
    // Stub - full implementation in Phase B
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
    return { skills: [], diagnostics: [] };
  }

  getPrompts(): { prompts: LoadedPromptTemplate[]; diagnostics: ResourceDiagnostic[] } {
    return { prompts: [], diagnostics: [] };
  }

  getThemes(): { themes: Theme[]; diagnostics: ResourceDiagnostic[] } {
    return { themes: [], diagnostics: [] };
  }

  getAgentsFiles(): { agentsFiles: Array<{ path: string; content: string }> } {
    return { agentsFiles: [] };
  }

  getSystemPrompt(): string | undefined {
    return undefined;
  }

  getAppendSystemPrompt(): string[] {
    return [];
  }

  async reload(): Promise<void> {
    // Stub - full implementation in Phase B
  }
}

/**
 * Load project context files (AGENTS.md, CLAUDE.md)
 */
export function loadProjectContextFiles(options: {
  cwd: string;
  agentDir: string;
}): Array<{ path: string; content: string }> {
  // Stub implementation - will be implemented in Phase B
  return [];
}