/**
 * Prompt Templates - Load and expand prompt templates from markdown files
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Template argument substitution ($1, $2, $@, $ARGUMENTS)
 * - Frontmatter parsing
 * - Directory scanning
 */
import { type SourceInfo } from "./source-info.js";
/**
 * Represents a prompt template loaded from a markdown file
 */
export interface PromptTemplate {
    /** Template name (filename without .md) */
    name: string;
    /** Description from frontmatter or first line */
    description: string;
    /** Argument hint for CLI */
    argumentHint?: string;
    /** Template content */
    content: string;
    /** Source info */
    sourceInfo: SourceInfo;
    /** Absolute path to the template file */
    filePath: string;
}
/**
 * Options for loading prompt templates
 */
export interface LoadPromptTemplatesOptions {
    /** Working directory for project-local templates */
    cwd: string;
    /** Agent config directory for global templates */
    agentDir: string;
    /** Explicit prompt template paths (files or directories) */
    promptPaths: string[];
    /** Include default prompt directories */
    includeDefaults: boolean;
}
/**
 * Parse command arguments respecting quoted strings (bash-style)
 * Returns array of arguments
 */
export declare function parseCommandArgs(argsString: string): string[];
/**
 * Substitute argument placeholders in template content
 * Supports:
 * - $1, $2, ... for positional args
 * - $@ and $ARGUMENTS for all args
 * - ${@:N} for args from Nth onwards (bash-style slicing)
 * - ${@:N:L} for L args starting from Nth
 */
export declare function substituteArgs(content: string, args: string[]): string;
/**
 * Load all prompt templates from:
 * 1. Global: agentDir/prompts/
 * 2. Project: cwd/{CONFIG_DIR_NAME}/prompts/
 * 3. Explicit prompt paths
 */
export declare function loadPromptTemplates(options: LoadPromptTemplatesOptions): PromptTemplate[];
/**
 * Expand a prompt template if it matches a template name.
 * Returns the expanded content or the original text if not a template.
 */
export declare function expandPromptTemplate(text: string, templates: PromptTemplate[]): string;
//# sourceMappingURL=prompt-templates.d.ts.map