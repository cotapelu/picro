// SPDX-License-Identifier: Apache-2.0
/**
 * Picro Agent - Main entry point.
 *
 * Orchestrates CLI parsing, session management, and interactive/print modes.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import * as readline from "node:readline";
import { parseArgs, type Args } from "./runtime/cli-args.js";
import { processFileArguments, type ProcessedFiles } from "./cli/file-processor.js";
import { buildInitialMessage, type InitialMessageResult } from "./cli/initial-message.js";
import { listModels } from "./cli/list-models.js";
import { selectSession, type SessionsLoader } from "./cli/session-picker.js";
import { getMissingSessionCwdIssue, MissingSessionCwdError } from "./session/session-cwd.js";
import { createAgentSessionServices, type AgentSessionServices } from "./session/agent-session-services.js";
import { createAgentSessionFromServices, type SessionStartEvent } from "./session/agent-session-services.js";
import { SessionManager } from "./session/session-manager.js";
import { AgentSessionRuntime } from "./runtime/agent-session-runtime.js";
import { getAgentDir, VERSION, getSettingsPath } from "./config.js";
import { resetTimings, time, printTimings } from "./utils/timings.js";
import { handleConfigCommand } from "./package-manager-cli.js";
import { isLocalPath } from "./utils/paths.js";
import { runMigrations, showDeprecationWarnings } from "./migrations.js";
import type { Model } from "./llm/index.js";
// Ink TUI will be dynamically imported to avoid ESM/CJS conflicts
import { runPrintMode } from "./modes/print-mode.js";
import { runRpcMode } from "./modes/rpc-mode.js";
import type { AgentSessionRuntimeDiagnostic } from "./session/agent-session-services.js";

// Load environment variables from .env
function loadEnvFile(): void {
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
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
function resolveAppMode(parsed: Args, stdinIsTTY: boolean): "interactive" | "print" | "json" | "rpc" {
  // If mode explicitly set via --mode, use it
  if (parsed.mode === "rpc") return "rpc";
  if (parsed.mode === "json") return "json";
  // Note: "interactive" is not a valid --mode value; it's the default when TTY and not --print
  // Default selection based on TTY and --print flag
  if (parsed.print || !stdinIsTTY) return "print";
  return "interactive";
}

// Print help message
function printHelp(): void {
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
function readStdin(timeoutMs: number = 100): Promise<string> {
  return new Promise<string>((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    const onData = (chunk: string) => { data += chunk; };
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
function promptConfirm(message: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(message, (ans: string) => {
      rl.close();
      resolve(ans.toLowerCase() === "y" || ans.toLowerCase() === "yes");
    });
  });
}

// Resolve a session argument to a file path
async function resolveSessionPath(
  arg: string,
  cwd: string,
  sessionDir?: string
): Promise<{ type: "path" | "local" | "global" | "not_found"; path?: string; cwd?: string; arg: string }> {
  if (arg.includes("/") || arg.includes("\\") || arg.endsWith(".jsonl")) {
    const path = resolve(arg);
    return { type: "path", path, arg };
  }
  // Try local
  const local = await SessionManager.list(cwd, sessionDir);
  const localMatch = local.find((s) => s.id.startsWith(arg));
  if (localMatch) {
    return { type: "local", path: localMatch.path, arg };
  }
  // Try global
  const all = await SessionManager.listAll();
  const globalMatch = all.find((s) => s.id.startsWith(arg));
  if (globalMatch) {
    return { type: "global", path: globalMatch.path, cwd: globalMatch.cwd, arg };
  }
  return { type: "not_found", arg };
}

async function main(): Promise<void> {
  loadEnvFile();
  resetTimings();
  time("total");

  const args = process.argv.slice(2);

  // Handle config commands early
  if (await handleConfigCommand(args)) {
    return;
  }

  const parsed = parseArgs(args);
  time("parseArgs");

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
    console.log(VERSION);
    return;
  }

  const stdinIsTTY = process.stdin.isTTY;
  const appMode = resolveAppMode(parsed, stdinIsTTY);
  // DEBUG: Log TTY status and mode
  if (parsed.verbose) {
    console.log("DEBUG: stdin.isTTY=", stdinIsTTY, "appMode=", appMode);
  }
  time("resolveAppMode");

  // Setup
  const cwd = process.cwd();
  const agentDir = getAgentDir();

  // Run migrations
  const { migratedAuthProviders, deprecationWarnings } = runMigrations(cwd);
  if (migratedAuthProviders.length > 0) {
    console.log(`Migrated auth config for providers: ${migratedAuthProviders.join(", ")}`);
  }
  if (appMode === "interactive" && deprecationWarnings.length > 0) {
    await showDeprecationWarnings(deprecationWarnings);
  }

  // Create services (settings, model registry, resource loader, auth)
  const services = await createAgentSessionServices({
    cwd,
    agentDir,
    resourceLoaderOptions: {
      noExtensions: parsed.noExtensions,
      noSkills: parsed.noSkills,
      noPromptTemplates: parsed.noPromptTemplates,
      noThemes: parsed.noThemes,
      noContextFiles: parsed.noContextFiles,
    },
  });
  time("createAgentSessionServices");

  // Report diagnostics collected during service creation
  if (services.diagnostics?.length > 0) {
    for (const diag of services.diagnostics) {
      const prefix = diag.type === 'error' ? 'Error' : diag.type === 'warning' ? 'Warning' : 'Info';
      console.error(`[${prefix}] ${diag.message}`);
    }
    // If there were errors, maybe exit? For now just print.
  }

  // Handle --list-models after services ready
  if (parsed.listModels) {
    const search = typeof parsed.listModels === "string" ? parsed.listModels : undefined;
    await listModels(services.modelRegistry, search);
    return;
  }

  // Determine session manager based on flags
  let sessionManager: SessionManager;
  const sessionStartEvent: SessionStartEvent = { type: "session_start", reason: "startup" };

  if (parsed.noSession) {
    sessionManager = SessionManager.inMemory(cwd);
    sessionStartEvent.reason = "new";
  } else if (parsed.fork) {
    const resolved = await resolveSessionPath(parsed.fork, cwd, services.sessionDir);
    if (resolved.type === "path" || resolved.type === "local") {
      // For now, fork is treated like open (forkFrom not implemented)
      sessionManager = SessionManager.open(resolved.path!, services.sessionDir);
    } else {
      console.error(`No session found matching '${resolved.arg}'`);
      process.exit(1);
    }
    sessionStartEvent.reason = "fork";
    sessionStartEvent.previousSessionFile = resolved.path;
  } else if (parsed.session) {
    const resolved = await resolveSessionPath(parsed.session, cwd, services.sessionDir);
    if (resolved.type === "path" || resolved.type === "local") {
      sessionManager = SessionManager.open(resolved.path!, services.sessionDir);
    } else if (resolved.type === "global") {
      console.log(`Session found in different project: ${resolved.cwd}`);
      const shouldFork = await promptConfirm(`Fork this session into current project? (y/N): `);
      if (!shouldFork) {
        process.exit(0);
      }
      sessionManager = SessionManager.open(resolved.path!, services.sessionDir);
    } else {
      console.error(`No session found matching '${resolved.arg}'`);
      process.exit(1);
    }
    sessionStartEvent.reason = "resume";
    sessionStartEvent.previousSessionFile = resolved.path;
  } else if (parsed.resume) {
    const loader: SessionsLoader = async () => await SessionManager.list(cwd, services.sessionDir);
    const selectedPath = await selectSession(loader);
    if (!selectedPath) {
      process.exit(0);
    }
    sessionManager = SessionManager.open(selectedPath, services.sessionDir);
    sessionStartEvent.reason = "resume";
    sessionStartEvent.previousSessionFile = selectedPath;
  } else if (parsed.continue) {
    sessionManager = SessionManager.continueRecent(cwd, services.sessionDir);
    sessionStartEvent.reason = "resume";
  } else {
    sessionManager = SessionManager.create(cwd, services.sessionDir);
    sessionStartEvent.reason = "new";
  }
  time("createSessionManager");

  // Resolve model from args or settings
  let resolvedModel: Model | undefined;
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
  const session = await createAgentSessionFromServices({
    services,
    sessionManager,
    sessionStartEvent,
    model: resolvedModel,
    thinkingLevel: parsed.thinking,
  });
  time("createAgentSession");

  // Construct runtime
  const runtime = new AgentSessionRuntime(session.agent, session, services);

  // Graceful shutdown on SIGTERM/SIGHUP
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    try { await runtime.dispose(); } catch (err) { console.error('Error during shutdown:', err); }
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));
  time("createAgentSessionRuntime");

  // Check session cwd existence
  const missingCwdIssue = getMissingSessionCwdIssue(session.sessionManager, cwd);
  if (missingCwdIssue) {
    if (appMode === "interactive") {
      const ok = await promptConfirm(`Session cwd "${missingCwdIssue.sessionCwd}" not found. Use current cwd "${cwd}"? (y/N): `);
      const selectedCwd = ok ? cwd : undefined;
      if (!selectedCwd) {
        process.exit(0);
      }
      // Switch to new cwd by reopening session file with override
      await runtime.switchSession(missingCwdIssue.sessionFile!, { cwdOverride: selectedCwd });
    } else {
      console.error(new MissingSessionCwdError(missingCwdIssue).message);
      process.exit(1);
    }
  }

  // Prepare initial message from stdin, files
  let fileText = "";
  let fileImages: any[] = [];
  if (parsed.fileArgs.length > 0) {
    const fileResult: ProcessedFiles = await processFileArguments(parsed.fileArgs);
    fileText = fileResult.text;
    fileImages = fileResult.images;
  }

  let stdinContent: string | undefined;
  if (!stdinIsTTY) {
    stdinContent = await readStdin();
  }

  const initialResult: InitialMessageResult = buildInitialMessage({
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
      // Use TUI bootstrap to load ESM TUI
      const { runTui } = require('./tui-bootstrap.js');
      await runTui(runtime);
    } catch (err: any) {
      console.error('Interactive mode error:', err.message || err);
    }
  } else if (appMode === "print" || appMode === "json") {
    // If no input at all, show helpful message
    if (!initialResult.initialMessage && parsed.messages.length === 0 && !stdinContent) {
      console.log("No input provided. Use one of:");
      console.log("  picro 'your question'               # text mode");
      console.log("  echo 'question' | picro             # pipe stdin");
      console.log("  picro --mode interactive             # interactive TUI (requires TTY)");
      console.log("  picro --list-models                  # list models");
      await runtime.dispose();
      printTimings();
      process.exit(0);
    }
    const exitCode = await runPrintMode(runtime, {
      mode: appMode === "json" ? "json" : "text",
      messages: parsed.messages,
      initialMessage: initialResult.initialMessage,
      initialImages: initialResult.initialImages,
    });
    await runtime.dispose();
    printTimings();
    process.exit(exitCode);
  } else if (appMode === "rpc") {
    try {
      await runRpcMode(runtime);
    } catch (err: any) {
      console.error("RPC mode error:", err.message || err);
      process.exit(1);
    }
  }

  printTimings();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
