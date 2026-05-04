// SPDX-License-Identifier: Apache-2.0
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
  diagnostics: Array<{ type: "warning" | "error"; message: string }>;
}

const VALID_THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;

export function isValidThinkingLevel(level: string): level is ThinkingLevel {
  return VALID_THINKING_LEVELS.includes(level as ThinkingLevel);
}

export function parseArgs(args: string[]): Args {
  const result: Args = {
    messages: [],
    fileArgs: [],
    unknownFlags: new Map(),
    diagnostics: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--version" || arg === "-v") {
      result.version = true;
    } else if (arg === "--mode" && i + 1 < args.length) {
      const mode = args[++i];
      if (mode === "text" || mode === "json" || mode === "rpc") {
        result.mode = mode;
      }
    } else if (arg === "--continue" || arg === "-c") {
      result.continue = true;
    } else if (arg === "--resume" || arg === "-r") {
      result.resume = true;
    } else if (arg === "--provider" && i + 1 < args.length) {
      result.provider = args[++i];
    } else if (arg === "--model" && i + 1 < args.length) {
      result.model = args[++i];
    } else if (arg === "--api-key" && i + 1 < args.length) {
      result.apiKey = args[++i];
    } else if (arg === "--system-prompt" && i + 1 < args.length) {
      result.systemPrompt = args[++i];
    } else if (arg === "--append-system-prompt" && i + 1 < args.length) {
      result.appendSystemPrompt = result.appendSystemPrompt ?? [];
      result.appendSystemPrompt.push(args[++i]);
    } else if (arg === "--no-session") {
      result.noSession = true;
    } else if (arg === "--session" && i + 1 < args.length) {
      result.session = args[++i];
    } else if (arg === "--fork" && i + 1 < args.length) {
      result.fork = args[++i];
    } else if (arg === "--session-dir" && i + 1 < args.length) {
      result.sessionDir = args[++i];
    } else if (arg === "--models" && i + 1 < args.length) {
      result.models = args[++i].split(",").map((s) => s.trim());
    } else if (arg === "--no-tools" || arg === "-nt") {
      result.noTools = true;
    } else if (arg === "--no-builtin-tools" || arg === "-nbt") {
      result.noBuiltinTools = true;
    } else if ((arg === "--tools" || arg === "-t") && i + 1 < args.length) {
      result.tools = args[++i]
        .split(",")
        .map((s) => s.trim())
        .filter((name) => name.length > 0);
    } else if (arg === "--thinking" && i + 1 < args.length) {
      const level = args[++i];
      if (isValidThinkingLevel(level)) {
        result.thinking = level;
      } else {
        result.diagnostics.push({
          type: "warning",
          message: `Invalid thinking level "${level}". Valid values: ${VALID_THINKING_LEVELS.join(", ")}`,
        });
      }
    } else if (arg === "--print" || arg === "-p") {
      result.print = true;
    } else if (arg === "--export" && i + 1 < args.length) {
      result.export = args[++i];
    } else if ((arg === "--extension" || arg === "-e") && i + 1 < args.length) {
      result.extensions = result.extensions ?? [];
      result.extensions.push(args[++i]);
    } else if (arg === "--no-extensions" || arg === "-ne") {
      result.noExtensions = true;
    } else if (arg === "--skill" && i + 1 < args.length) {
      result.skills = result.skills ?? [];
      result.skills.push(args[++i]);
    } else if (arg === "--prompt-template" && i + 1 < args.length) {
      result.promptTemplates = result.promptTemplates ?? [];
      result.promptTemplates.push(args[++i]);
    } else if (arg === "--theme" && i + 1 < args.length) {
      result.themes = result.themes ?? [];
      result.themes.push(args[++i]);
    } else if (arg === "--no-skills" || arg === "-ns") {
      result.noSkills = true;
    } else if (arg === "--no-prompt-templates" || arg === "-np") {
      result.noPromptTemplates = true;
    } else if (arg === "--no-themes") {
      result.noThemes = true;
    } else if (arg === "--no-context-files" || arg === "-nc") {
      result.noContextFiles = true;
    } else if (arg === "--list-models") {
      if (i + 1 < args.length && !args[i + 1].startsWith("-") && !args[i + 1].startsWith("@")) {
        result.listModels = args[++i];
      } else {
        result.listModels = true;
      }
    } else if (arg === "--verbose") {
      result.verbose = true;
    } else if (arg === "--offline") {
      result.offline = true;
    } else if (arg.startsWith("@")) {
      result.fileArgs.push(arg.slice(1));
    } else if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex !== -1) {
        result.unknownFlags.set(arg.slice(2, eqIndex), arg.slice(eqIndex + 1));
      } else {
        const flagName = arg.slice(2);
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith("-") && !next.startsWith("@")) {
          result.unknownFlags.set(flagName, next);
          i++;
        } else {
          result.unknownFlags.set(flagName, true);
        }
      }
    } else if (arg.startsWith("-") && !arg.startsWith("--")) {
      result.diagnostics.push({ type: "error", message: `Unknown option: ${arg}` });
    } else if (!arg.startsWith("-")) {
      result.messages.push(arg);
    }
  }

  return result;
}

export function printHelp(): void {
  console.log(`pi - AI coding assistant with read, bash, edit, write tools

Usage:
  pi [options] [@files...] [messages...]

Commands:
  pi install <source> [-l]     Install extension source and add to settings
  pi remove <source> [-l]        Remove extension source from settings

Options:
  --provider <name>              Provider name (default: google)
  --model <pattern>              Model pattern or ID (supports "provider/id" and ":<thinking>")
  --api-key <key>               API key (defaults to env vars)
  --system-prompt <text>         System prompt (default: coding assistant prompt)
  --append-system-prompt <text>  Append text or file contents to system prompt
  --mode <mode>                  Output mode: text (default), json, or rpc
  --print, -p                   Non-interactive mode: process prompt and exit
  --continue, -c                Continue previous session
  --resume, -r                   Select a session to resume
  --session <path|id>             Use specific session file or partial UUID
  --fork <path|id>              Fork specific session into a new session
  --session-dir <dir>            Directory for session storage
  --no-session                   Don't save session (ephemeral)
  --models <patterns>            Comma-separated model patterns for cycling
  --no-tools, -nt                Disable all tools
  --no-builtin-tools, -nbt       Disable built-in tools
  --tools, -t <tools>            Comma-separated allowlist of tool names
  --thinking <level>             Set thinking level: off, minimal, low, medium, high, xhigh
  --extension, -e <path>          Load an extension file
  --no-extensions, -ne           Disable extension discovery
  --skill <path>                 Load a skill file or directory
  --no-skills, -ns               Disable skills discovery
  --prompt-template <path>         Load a prompt template
  --no-prompt-templates, -np       Disable prompt template discovery
  --theme <path>                 Load a theme file
  --no-themes                    Disable theme discovery
  --no-context-files, -nc        Disable AGENTS.md and CLAUDE.md discovery
  --export <file>                Export session file to HTML
  --list-models [search]         List available models (with optional search)
  --verbose                      Force verbose startup
  --offline                      Disable startup network operations
  --help, -h                     Show this help
  --version, -v                  Show version number

Environment Variables:
  ANTHROPIC_API_KEY               - Anthropic Claude API key
  OPENAI_API_KEY                - OpenAI GPT API key
  GEMINI_API_KEY                - Google Gemini API key
  GROQ_API_KEY                  - Groq API key
  PI_AGENT_DIR                  - Session storage directory
  PI_OFFLINE                    - Disable network operations

Built-in Tool Names:
  read   - Read file contents
  bash   - Execute bash commands
  edit   - Edit files with find/replace
  write  - Write files (creates/overwrites)
  grep   - Search file contents
  find   - Find files by glob pattern
  ls     - List directory contents
`);
}