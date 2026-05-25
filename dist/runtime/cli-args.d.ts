/**
 * CLI Args - Full argument parsing
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Full argument parsing
 * - @fileArgs support
 * - Extension flags support
 */
export type Mode = "text" | "json" | "rpc";
export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
export interface Args {
    provider?: string;
    model?: string;
    apiKey?: string;
    systemPrompt?: string;
    appendSystemPrompt?: string[];
    thinking?: ThinkingLevel;
    continue?: boolean;
    resume?: boolean;
    help?: boolean;
    version?: boolean;
    mode?: Mode;
    noSession?: boolean;
    session?: string;
    fork?: string;
    sessionDir?: string;
    models?: string[];
    tools?: string[];
    noTools?: boolean;
    noBuiltinTools?: boolean;
    extensions?: string[];
    noExtensions?: boolean;
    print?: boolean;
    export?: string;
    noSkills?: boolean;
    skills?: string[];
    promptTemplates?: string[];
    noPromptTemplates?: boolean;
    themes?: string[];
    noThemes?: boolean;
    noContextFiles?: boolean;
    listModels?: string | true;
    offline?: boolean;
    verbose?: boolean;
    messages: string[];
    fileArgs: string[];
    unknownFlags: Map<string, boolean | string>;
    diagnostics: Array<{
        type: "warning" | "error";
        message: string;
    }>;
}
export declare function isValidThinkingLevel(level: string): level is ThinkingLevel;
export declare function parseArgs(args: string[]): Args;
export declare function printHelp(): void;
//# sourceMappingURL=cli-args.d.ts.map