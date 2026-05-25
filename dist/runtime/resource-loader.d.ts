/**
 * Resource Loader - Load extensions, skills, prompts, themes, context files
 *
 * This is a stub implementation - full implementation coming in Phase B
 */
import type { Skill } from "./skills.js";
/**
 * Resource loader interface for loading external resources
 */
export interface ResourceLoader {
    /** Get loaded extensions */
    getExtensions(): LoadExtensionsResult;
    /** Get loaded skills */
    getSkills(): {
        skills: Skill[];
        diagnostics: ResourceDiagnostic[];
    };
    /** Get loaded prompt templates */
    getPrompts(): {
        prompts: LoadedPromptTemplate[];
        diagnostics: ResourceDiagnostic[];
    };
    /** Get loaded themes */
    getThemes(): {
        themes: Theme[];
        diagnostics: ResourceDiagnostic[];
    };
    /** Get AGENTS.md/CLAUDE.md context files */
    getAgentsFiles(): {
        agentsFiles: Array<{
            path: string;
            content: string;
        }>;
    };
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
    flags: Map<string, {
        type: "boolean" | "string";
    }>;
    sourceInfo?: SourceInfo;
}
export interface LoadExtensionsResult {
    extensions: Extension[];
    errors: Array<{
        path: string;
        error: string;
    }>;
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
    [key: string]: any;
}
/**
 * Default resource loader implementation
 */
export declare class DefaultResourceLoader implements ResourceLoader {
    private _cwd;
    private _agentDir;
    private _skillsCache?;
    private _promptsCache?;
    private _themesCache?;
    private _agentsFilesCache?;
    private _extensionsResult?;
    private _extensionRunner?;
    private _systemPrompt?;
    private _appendSystemPrompt;
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
        extensionsOverride?: (base: LoadExtensionsResult) => LoadExtensionsResult;
        skillsOverride?: (base: {
            skills: Skill[];
            diagnostics: ResourceDiagnostic[];
        }) => {
            skills: Skill[];
            diagnostics: ResourceDiagnostic[];
        };
        promptsOverride?: (base: {
            prompts: any[];
            diagnostics: ResourceDiagnostic[];
        }) => {
            prompts: any[];
            diagnostics: ResourceDiagnostic[];
        };
        themesOverride?: (base: {
            themes: Theme[];
            diagnostics: ResourceDiagnostic[];
        }) => {
            themes: Theme[];
            diagnostics: ResourceDiagnostic[];
        };
        agentsFilesOverride?: (base: Array<{
            path: string;
            content: string;
        }>) => Array<{
            path: string;
            content: string;
        }>;
        systemPromptOverride?: (base: string | undefined) => string | undefined;
        appendSystemPromptOverride?: (base: string[]) => string[];
    });
    private _options;
    private _initialized;
    reload(): Promise<void>;
    getExtensions(): LoadExtensionsResult;
    getSkills(): {
        skills: Skill[];
        diagnostics: ResourceDiagnostic[];
    };
    getPrompts(): {
        prompts: any[];
        diagnostics: ResourceDiagnostic[];
    };
    getThemes(): {
        themes: Theme[];
        diagnostics: ResourceDiagnostic[];
    };
    getAgentsFiles(): {
        agentsFiles: Array<{
            path: string;
            content: string;
        }>;
    };
    getSystemPrompt(): string | undefined;
    getAppendSystemPrompt(): string[];
}
/**
 * Load project context files (AGENTS.md, CLAUDE.md)
 */
export declare function loadProjectContextFiles(options: {
    cwd: string;
    agentDir: string;
}): Array<{
    path: string;
    content: string;
}>;
//# sourceMappingURL=resource-loader.d.ts.map