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
import { parseArgs, type Args } from "./runtime/cli-args";
import { processFileArguments, type ProcessedFiles } from "./cli/file-processor";
import { buildInitialMessage, type InitialMessageResult } from "./cli/initial-message";
import { listModels } from "./cli/list-models";
import { selectSession, type SessionsLoader } from "./cli/session-picker";
import { getMissingSessionCwdIssue, MissingSessionCwdError } from "./core/session-cwd";
import { createAgentSessionServices, type AgentSessionServices } from "./session/agent-session-services";
import { createAgentSessionFromServices, type SessionStartEvent } from "./session/agent-session-services";
import { SessionManager } from "./session/session-manager";
import { AgentSessionRuntime } from "./runtime/agent-session-runtime";
import { getAgentDir, VERSION, getSettingsPath } from "./config";
import { resetTimings, time, printTimings } from "./utils/timings";
import { handleConfigCommand } from "./package-manager-cli";
import { isLocalPath } from "./utils/paths";
import { runMigrations, showDeprecationWarnings } from "./migrations";
import type { Model } from "./llm";
import { ProcessTerminal, TerminalUI } from "./tui";
import { InteractiveMode } from "./tui/interactive-mode";
import { runPrintMode } from "./modes/print-mode";
import { runRpcMode } from "./modes/rpc-mode";
import { themeManager } from "./tui/atoms/theme";
import type { AgentSessionRuntimeDiagnostic } from "./session/agent-session-services";

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
  if (parsed.mode === "rpc") return "rpc";
  if (parsed.mode === "json") return "json";
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
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
    process.stdin.resume();
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
  });
  time("createAgentSessionServices");

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

  // For non-interactive modes, we sent initial message via runPrintMode. For interactive, we may want to pre-load.
  if (appMode === "interactive") {
    // Initialize theme
    themeManager.setTheme(services.settingsManager.getTheme() as any);
    // Create terminal UI
    const terminal = new ProcessTerminal();
    const tui = new TerminalUI(terminal);
    // Create interactive mode
    const interactive = new InteractiveMode(tui, {
      inputPlaceholder: "Type your message...",
      initialStatus: "Ready",
    });
    interactive.setRuntime(runtime);

    // Add initial message to session (if any) to start conversation
    if (initialResult.initialMessage) {
      await session.prompt(initialResult.initialMessage, { images: initialResult.initialImages });
    }
    // Process any additional messages
    for (const msg of parsed.messages) {
      await session.prompt(msg);
    }

    try {
      await interactive.run();
    } catch (err: any) {
      console.error("Interactive mode error:", err.message || err);
    } finally {
      interactive.stop();
      tui.stop();
    }
  } else if (appMode === "print" || appMode === "json") {
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
