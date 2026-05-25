/**
 * System prompt construction for AgentSession.
 * Moved from agent/ to runtime/ because it's UI/runtime specific.
 *
 * Builds the system prompt with:
 * - Tool snippets and guidelines
 * - Project context files
 * - Skills
 * - Date and working directory
 */
export interface BuildSystemPromptOptions {
    /** Custom system prompt (replaces default) */
    customPrompt?: string;
    /** Tools to include in prompt */
    selectedTools?: string[];
    /** One-line tool snippets keyed by tool name */
    toolSnippets?: Record<string, string>;
    /** Additional guideline bullets */
    promptGuidelines?: string[];
    /** Text to append to system prompt */
    appendSystemPrompt?: string;
    /** Working directory */
    cwd: string;
    /** Pre-loaded context files */
    contextFiles?: Array<{
        path: string;
        content: string;
    }>;
    /** Pre-loaded skills */
    skills?: Array<{
        name: string;
        description: string;
        filePath: string;
    }>;
}
/** Build the system prompt */
export declare function buildSystemPrompt(options: BuildSystemPromptOptions): string;
//# sourceMappingURL=system-prompt.d.ts.map