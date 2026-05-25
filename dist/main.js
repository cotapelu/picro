"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Picro Agent - Main entry point.
 *
 * Orchestrates CLI parsing, session management, and interactive/print modes.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const readline = __importStar(require("node:readline"));
const cli_args_js_1 = require("./runtime/cli-args.js");
const file_processor_js_1 = require("./cli/file-processor.js");
const initial_message_js_1 = require("./cli/initial-message.js");
const list_models_js_1 = require("./cli/list-models.js");
const session_picker_js_1 = require("./cli/session-picker.js");
const session_cwd_js_1 = require("./session/session-cwd.js");
const agent_session_services_js_1 = require("./session/agent-session-services.js");
const agent_session_services_js_2 = require("./session/agent-session-services.js");
const session_manager_js_1 = require("./session/session-manager.js");
const agent_session_runtime_js_1 = require("./runtime/agent-session-runtime.js");
const config_js_1 = require("./config.js");
const timings_js_1 = require("./utils/timings.js");
const package_manager_cli_js_1 = require("./package-manager-cli.js");
const migrations_js_1 = require("./migrations.js");
// Ink TUI will be dynamically imported to avoid ESM/CJS conflicts
const print_mode_js_1 = require("./modes/print-mode.js");
const rpc_mode_js_1 = require("./modes/rpc-mode.js");
// Load environment variables from .env
function loadEnvFile() {
    const envPath = (0, node_path_1.join)(process.cwd(), ".env");
    if ((0, node_fs_1.existsSync)(envPath)) {
        const content = (0, node_fs_1.readFileSync)(envPath, "utf-8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
                const [key, ...valueParts] = trimmed.split("=");
                if (key && valueParts.length > 0) {
                    const value = valueParts.join("=").trim();
                    const cleaned = value.replace(/^["']|["']$/g, "");
                    process.env[key] = cleaned;
                }
            }
        }
    }
}
// Determine application mode
function resolveAppMode(parsed, stdinIsTTY) {
    // If mode explicitly set via --mode, use it
    if (parsed.mode === "rpc")
        return "rpc";
    if (parsed.mode === "json")
        return "json";
    // Note: "interactive" is not a valid --mode value; it's the default when TTY and not --print
    // Default selection based on TTY and --print flag
    if (parsed.print || !stdinIsTTY)
        return "print";
    return "interactive";
}
// Print help message
function printHelp() {
    console.log(`picro - AI coding assistant

Usage:
  picro [options] [@files...] [messages...]

Options:
  --provider <name>              Provider name (default: google)
  --model <pattern>              Model pattern or ID
  --api-key <key>                API key (defaults to env vars)
  --system-prompt <text>         System prompt
  --append-system-prompt <text>  Append to system prompt
  --mode <mode>                  Output mode: text (default), json, or rpc
  --print, -p                    Non-interactive mode: process prompt and exit
  --continue, -c                 Continue previous session
  --resume, -r                   Select a session to resume
  --session <path|id>            Use specific session file or partial UUID
  --fork <path|id>               Fork specific session into a new session
  --session-dir <dir>            Directory for session storage
  --no-session                   Don't save session (ephemeral)
  --models <patterns>            Comma-separated model patterns for cycling
  --no-tools, -nt                Disable all tools
  --no-builtin-tools, -nbt       Disable built-in tools
  --tools, -t <tools>            Comma-separated allowlist of tool names
  --thinking <level>             Set thinking level: off, minimal, low, medium, high, xhigh
  --extension, -e <path>         Load an extension file
  --no-extensions, -ne           Disable extension discovery
  --skill <path>                 Load a skill file or directory
  --no-skills, -ns               Disable skills discovery
  --prompt-template <path>       Load a prompt template file or directory
  --no-prompt-templates, -np     Disable prompt template discovery
  --theme <path>                 Load a theme file or directory
  --no-themes                    Disable theme discovery
  --no-context-files, -nc        Disable AGENTS.md and CLAUDE.md discovery
  --export <file>                Export session file to HTML (not yet implemented)
  --list-models [search]         List available models (with optional search)
  --verbose                      Force verbose startup
  --offline                      Disable startup network operations
  --help, -h                     Show this help
  --version, -v                  Show version number

Environment Variables:
  ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, etc.

Built-in Tool Names:
  read, bash, edit, write, grep, find, ls
`);
}
// Helper to read all stdin
function readStdin(timeoutMs = 100) {
    return new Promise((resolve) => {
        let data = "";
        process.stdin.setEncoding("utf8");
        const onData = (chunk) => { data += chunk; };
        const onEnd = () => { resolve(data.trim()); };
        process.stdin.on("data", onData);
        process.stdin.on("end", onEnd);
        process.stdin.resume();
        // Timeout to prevent hanging when no data is piped
        setTimeout(() => {
            process.stdin.removeListener("data", onData);
            process.stdin.removeListener("end", onEnd);
            resolve(data.trim());
        }, timeoutMs);
    });
}
// Simple yes/no prompt
function promptConfirm(message) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(message, (ans) => {
            rl.close();
            resolve(ans.toLowerCase() === "y" || ans.toLowerCase() === "yes");
        });
    });
}
// Resolve a session argument to a file path
async function resolveSessionPath(arg, cwd, sessionDir) {
    if (arg.includes("/") || arg.includes("\\") || arg.endsWith(".jsonl")) {
        const path = (0, node_path_1.resolve)(arg);
        return { type: "path", path, arg };
    }
    // Try local
    const local = await session_manager_js_1.SessionManager.list(cwd, sessionDir);
    const localMatch = local.find((s) => s.id.startsWith(arg));
    if (localMatch) {
        return { type: "local", path: localMatch.path, arg };
    }
    // Try global
    const all = await session_manager_js_1.SessionManager.listAll();
    const globalMatch = all.find((s) => s.id.startsWith(arg));
    if (globalMatch) {
        return { type: "global", path: globalMatch.path, cwd: globalMatch.cwd, arg };
    }
    return { type: "not_found", arg };
}
async function main() {
    loadEnvFile();
    (0, timings_js_1.resetTimings)();
    (0, timings_js_1.time)("total");
    const args = process.argv.slice(2);
    // Handle config commands early
    if (await (0, package_manager_cli_js_1.handleConfigCommand)(args)) {
        return;
    }
    const parsed = (0, cli_args_js_1.parseArgs)(args);
    (0, timings_js_1.time)("parseArgs");
    // Enable verbose debugging if flag set
    if (parsed.verbose) {
        process.env.VERBOSE = "true";
    }
    // Handle diagnostics errors
    if (parsed.diagnostics.some((d) => d.type === "error")) {
        for (const d of parsed.diagnostics) {
            const prefix = d.type === "error" ? "Error: " : "Warning: ";
            console.error(prefix + d.message);
        }
        process.exit(1);
    }
    // Help, version, list-models
    if (parsed.help) {
        printHelp();
        return;
    }
    if (parsed.version) {
        console.log(config_js_1.VERSION);
        return;
    }
    const stdinIsTTY = process.stdin.isTTY;
    const appMode = resolveAppMode(parsed, stdinIsTTY);
    // DEBUG: Log TTY status and mode
    if (parsed.verbose) {
        console.log("DEBUG: stdin.isTTY=", stdinIsTTY, "appMode=", appMode);
    }
    (0, timings_js_1.time)("resolveAppMode");
    // Setup
    const cwd = process.cwd();
    const agentDir = (0, config_js_1.getAgentDir)();
    // Run migrations
    const { migratedAuthProviders, deprecationWarnings } = (0, migrations_js_1.runMigrations)(cwd);
    if (migratedAuthProviders.length > 0) {
        console.log(`Migrated auth config for providers: ${migratedAuthProviders.join(", ")}`);
    }
    if (appMode === "interactive" && deprecationWarnings.length > 0) {
        await (0, migrations_js_1.showDeprecationWarnings)(deprecationWarnings);
    }
    // Create services (settings, model registry, resource loader, auth)
    const services = await (0, agent_session_services_js_1.createAgentSessionServices)({
        cwd,
        agentDir,
    });
    (0, timings_js_1.time)("createAgentSessionServices");
    // Handle --list-models after services ready
    if (parsed.listModels) {
        const search = typeof parsed.listModels === "string" ? parsed.listModels : undefined;
        await (0, list_models_js_1.listModels)(services.modelRegistry, search);
        return;
    }
    // Determine session manager based on flags
    let sessionManager;
    const sessionStartEvent = { type: "session_start", reason: "startup" };
    if (parsed.noSession) {
        sessionManager = session_manager_js_1.SessionManager.inMemory(cwd);
        sessionStartEvent.reason = "new";
    }
    else if (parsed.fork) {
        const resolved = await resolveSessionPath(parsed.fork, cwd, services.sessionDir);
        if (resolved.type === "path" || resolved.type === "local") {
            // For now, fork is treated like open (forkFrom not implemented)
            sessionManager = session_manager_js_1.SessionManager.open(resolved.path, services.sessionDir);
        }
        else {
            console.error(`No session found matching '${resolved.arg}'`);
            process.exit(1);
        }
        sessionStartEvent.reason = "fork";
        sessionStartEvent.previousSessionFile = resolved.path;
    }
    else if (parsed.session) {
        const resolved = await resolveSessionPath(parsed.session, cwd, services.sessionDir);
        if (resolved.type === "path" || resolved.type === "local") {
            sessionManager = session_manager_js_1.SessionManager.open(resolved.path, services.sessionDir);
        }
        else if (resolved.type === "global") {
            console.log(`Session found in different project: ${resolved.cwd}`);
            const shouldFork = await promptConfirm(`Fork this session into current project? (y/N): `);
            if (!shouldFork) {
                process.exit(0);
            }
            sessionManager = session_manager_js_1.SessionManager.open(resolved.path, services.sessionDir);
        }
        else {
            console.error(`No session found matching '${resolved.arg}'`);
            process.exit(1);
        }
        sessionStartEvent.reason = "resume";
        sessionStartEvent.previousSessionFile = resolved.path;
    }
    else if (parsed.resume) {
        const loader = async () => await session_manager_js_1.SessionManager.list(cwd, services.sessionDir);
        const selectedPath = await (0, session_picker_js_1.selectSession)(loader);
        if (!selectedPath) {
            process.exit(0);
        }
        sessionManager = session_manager_js_1.SessionManager.open(selectedPath, services.sessionDir);
        sessionStartEvent.reason = "resume";
        sessionStartEvent.previousSessionFile = selectedPath;
    }
    else if (parsed.continue) {
        sessionManager = session_manager_js_1.SessionManager.continueRecent(cwd, services.sessionDir);
        sessionStartEvent.reason = "resume";
    }
    else {
        sessionManager = session_manager_js_1.SessionManager.create(cwd, services.sessionDir);
        sessionStartEvent.reason = "new";
    }
    (0, timings_js_1.time)("createSessionManager");
    // Resolve model from args or settings
    let resolvedModel;
    if (parsed.model) {
        const providerHint = parsed.provider || services.settingsManager.getDefaultProvider();
        if (providerHint) {
            resolvedModel = services.modelRegistry.find(providerHint, parsed.model);
        }
        if (!resolvedModel) {
            const allProviders = services.modelRegistry.getProviders();
            for (const p of allProviders) {
                const m = services.modelRegistry.find(p, parsed.model);
                if (m) {
                    resolvedModel = m;
                    break;
                }
            }
        }
        if (!resolvedModel) {
            console.error(`Model not found: ${parsed.model}`);
            process.exit(1);
        }
    }
    // Create session from services
    const session = await (0, agent_session_services_js_2.createAgentSessionFromServices)({
        services,
        sessionManager,
        sessionStartEvent,
        model: resolvedModel,
        thinkingLevel: parsed.thinking,
    });
    (0, timings_js_1.time)("createAgentSession");
    // Construct runtime
    const runtime = new agent_session_runtime_js_1.AgentSessionRuntime(session.agent, session, services);
    // Graceful shutdown on SIGTERM/SIGHUP
    const shutdown = async (signal) => {
        console.log(`\nReceived ${signal}, shutting down gracefully...`);
        try {
            await runtime.dispose();
        }
        catch (err) {
            console.error('Error during shutdown:', err);
        }
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
    (0, timings_js_1.time)("createAgentSessionRuntime");
    // Check session cwd existence
    const missingCwdIssue = (0, session_cwd_js_1.getMissingSessionCwdIssue)(session.sessionManager, cwd);
    if (missingCwdIssue) {
        if (appMode === "interactive") {
            const ok = await promptConfirm(`Session cwd "${missingCwdIssue.sessionCwd}" not found. Use current cwd "${cwd}"? (y/N): `);
            const selectedCwd = ok ? cwd : undefined;
            if (!selectedCwd) {
                process.exit(0);
            }
            // Switch to new cwd by reopening session file with override
            await runtime.switchSession(missingCwdIssue.sessionFile, { cwdOverride: selectedCwd });
        }
        else {
            console.error(new session_cwd_js_1.MissingSessionCwdError(missingCwdIssue).message);
            process.exit(1);
        }
    }
    // Prepare initial message from stdin, files
    let fileText = "";
    let fileImages = [];
    if (parsed.fileArgs.length > 0) {
        const fileResult = await (0, file_processor_js_1.processFileArguments)(parsed.fileArgs);
        fileText = fileResult.text;
        fileImages = fileResult.images;
    }
    let stdinContent;
    if (!stdinIsTTY) {
        stdinContent = await readStdin();
    }
    const initialResult = (0, initial_message_js_1.buildInitialMessage)({
        parsed,
        fileText: fileText || undefined,
        fileImages: fileImages.length > 0 ? fileImages : undefined,
        stdinContent,
    });
    // For interactive mode, use Ink-based UI
    if (appMode === "interactive") {
        // Add initial message to session (if any) to start conversation
        if (initialResult.initialMessage) {
            await session.prompt(initialResult.initialMessage, { images: initialResult.initialImages });
        }
        // Process any additional messages
        for (const msg of parsed.messages) {
            await session.prompt(msg);
        }
        try {
            // Load unbundled Ink TUI (ESM) - compiled at build time
            // @ts-ignore - module exists at runtime after build
            const { runInkApp } = await Promise.resolve().then(() => __importStar(require("./tui/ink/index.js")));
            await runInkApp(runtime);
        }
        catch (err) {
            console.error("Interactive mode error:", err.message || err);
        }
    }
    else if (appMode === "print" || appMode === "json") {
        // If no input at all, show helpful message
        if (!initialResult.initialMessage && parsed.messages.length === 0 && !stdinContent) {
            console.log("No input provided. Use one of:");
            console.log("  picro 'your question'               # text mode");
            console.log("  echo 'question' | picro             # pipe stdin");
            console.log("  picro --mode interactive             # interactive TUI (requires TTY)");
            console.log("  picro --list-models                  # list models");
            await runtime.dispose();
            (0, timings_js_1.printTimings)();
            process.exit(0);
        }
        const exitCode = await (0, print_mode_js_1.runPrintMode)(runtime, {
            mode: appMode === "json" ? "json" : "text",
            messages: parsed.messages,
            initialMessage: initialResult.initialMessage,
            initialImages: initialResult.initialImages,
        });
        await runtime.dispose();
        (0, timings_js_1.printTimings)();
        process.exit(exitCode);
    }
    else if (appMode === "rpc") {
        try {
            await (0, rpc_mode_js_1.runRpcMode)(runtime);
        }
        catch (err) {
            console.error("RPC mode error:", err.message || err);
            process.exit(1);
        }
    }
    (0, timings_js_1.printTimings)();
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map