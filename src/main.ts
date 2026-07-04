// SPDX-License-Identifier: Apache-2.0
/**
 * Picro Agent - Main entry point.
 *
 * Flow: Parse args → Create runtime → Send initial messages → Start TTYMode
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as readline from "node:readline";
import { parseArgs } from "./runtime/cli-args.js";
import { processFileArguments, type ProcessedFiles } from "./cli/file-processor.js";
import { buildInitialMessage, type InitialMessageResult } from "./cli/initial-message.js";
import { listModels } from "./cli/list-models.js";
import { selectSession, type SessionsLoader } from "./cli/session-picker.js";
import { getMissingSessionCwdIssue } from "./session/session-cwd.js";
import { createAgentSessionServices } from "./session/agent-session-services.js";
import { createAgentSessionFromServices, type SessionStartEvent } from "./session/agent-session-services.js";
import { SessionManager } from "./session/session-manager.js";
import { AgentSessionRuntime } from "./runtime/agent-session-runtime.js";
import type { AgentSessionInterface } from "./runtime/agent-session-interfaces.js";
import { getAgentDir, VERSION } from "./config.js";
import { resetTimings, time, printTimings } from "./utils/timings.js";
import { handleConfigCommand } from "./package-manager-cli.js";
import { runMigrations, showDeprecationWarnings } from "./migrations.js";
import type { Model } from "./llm/index.js";
import { TTYMode } from "./tty-mode.js";

function subscribeToSessionEvents(runtime: { session: AgentSessionInterface }) {
  const session = runtime.session as any;
  console.log('[DEBUG] Subscribing to session events...');
  if (session && typeof session.subscribe === 'function') {
    const unsub = session.subscribe((event: any) => {
      if (process.env.VERBOSE) {
        console.log(`[DEBUG] Event: ${event.type}`, event);
      }
      if (event.type === 'message_end') {
        console.log('[DEBUG] message_end event received');
        const msgs = session.messages as any[] || [];
        const lastAssistant = [...msgs].reverse().find((m: any) => m.role === 'assistant');
        if (lastAssistant) {
          const content = lastAssistant.content as any[] || [];
          const text = content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
          if (text) {
            console.log('');
            console.log(text);
          } else {
            console.log('[No text in response]');
          }
        } else {
          console.log('[No assistant message in history]');
        }
      }
      if (event.type === 'agent_end') {
        console.log('[DEBUG] agent_end event received');
        const msgs = session.messages as any[] || [];
        console.log('[DEBUG] Final messages with full content:', JSON.stringify(msgs, null, 2));
      }
    });
    // Keep unsub if needed later
  } else {
    console.warn('[DEBUG] Session does not have subscribe method');
  }
}

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

async function promptConfirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise<string>((resolve) => {
    rl.question(message, (ans: string) => {
      rl.close();
      resolve(ans.toLowerCase());
    });
  });
  return ans === "y" || ans === "yes";
}

async function resolveSessionPath(
  arg: string,
  cwd: string,
  sessionDir?: string
): Promise<{ type: "path" | "local" | "global" | "not_found"; path?: string; cwd?: string; arg: string }> {
  if (arg.includes("/") || arg.includes("\\") || arg.endsWith(".jsonl")) {
    return { type: "path", path: resolve(arg), arg };
  }
  const local = await SessionManager.list(cwd, sessionDir);
  const localMatch = local.find((s) => s.id.startsWith(arg));
  if (localMatch) {
    return { type: "local", path: localMatch.path, arg };
  }
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

  if (await handleConfigCommand(args)) {
    return;
  }

  const parsed = parseArgs(args);
  time("parseArgs");

  if (parsed.verbose) {
    process.env.VERBOSE = "true";
  }

  if (parsed.diagnostics.some((d) => d.type === "error")) {
    for (const d of parsed.diagnostics) {
      const prefix = d.type === "error" ? "Error: " : "Warning: ";
      console.error(prefix + d.message);
    }
    process.exit(1);
  }

  if (parsed.help) {
    printHelp();
    return;
  }
  if (parsed.version) {
    console.log(VERSION);
    return;
  }

  // Require TTY (no pipe mode)
  if (!process.stdin.isTTY) {
    console.error("Error: Interactive mode requires a TTY. Pipe mode is not supported.");
    process.exit(1);
  }

  const cwd = process.cwd();
  const agentDir = getAgentDir();

  const { migratedAuthProviders, deprecationWarnings } = runMigrations(cwd);
  if (migratedAuthProviders.length > 0) {
    console.log(`Migrated auth config for providers: ${migratedAuthProviders.join(", ")}`);
  }
  if (deprecationWarnings.length > 0) {
    await showDeprecationWarnings(deprecationWarnings);
  }

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

  if (parsed.provider) {
    services.settingsManager.setDefaultProvider(parsed.provider);
  }

  if (parsed.apiKey) {
    const provider = parsed.provider || services.settingsManager.getDefaultProvider();
    if (!provider) {
      console.error('No provider specified for API key. Use --provider <name> or set defaultProvider in settings.');
      process.exit(1);
    }
    await services.authStorage.setApiKey(provider, parsed.apiKey);
    if (!services.settingsManager.getDefaultProvider()) {
      services.settingsManager.setDefaultProvider(provider);
    }
  }

  if (services.diagnostics?.length > 0) {
    for (const diag of services.diagnostics) {
      const prefix = diag.type === 'error' ? 'Error' : diag.type === 'warning' ? 'Warning' : 'Info';
      console.error(`[${prefix}] ${diag.message}`);
    }
  }

  if (parsed.listModels) {
    const search = typeof parsed.listModels === "string" ? parsed.listModels : undefined;
    await listModels(services.modelRegistry, search);
    return;
  }

  // Determine session manager
  let sessionManager: SessionManager;
  const sessionStartEvent: SessionStartEvent = { type: "session_start", reason: "startup" };

  if (parsed.noSession) {
    sessionManager = SessionManager.inMemory(cwd);
    sessionStartEvent.reason = "new";
  } else if (parsed.fork) {
    const resolved = await resolveSessionPath(parsed.fork, cwd, services.sessionDir);
    if (resolved.type === "path" || resolved.type === "local") {
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

  // Resolve model
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

  // Create session
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

  // Subscribe to events EARLY - before sending any messages
  subscribeToSessionEvents(runtime);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    try { await runtime.dispose(); } catch (err) { console.error('Error during shutdown:', err); }
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));
  time("createAgentSessionRuntime");

  // Check session cwd
  const missingCwdIssue = getMissingSessionCwdIssue(session.sessionManager, cwd);
  if (missingCwdIssue) {
    const ok = await promptConfirm(`Session cwd "${missingCwdIssue.sessionCwd}" not found. Use current cwd "${cwd}"? (y/N): `);
    const selectedCwd = ok ? cwd : undefined;
    if (!selectedCwd) {
      process.exit(0);
    }
    await runtime.switchSession(missingCwdIssue.sessionFile!, { cwdOverride: selectedCwd });
  }

  // Prepare initial message from files only (no stdin)
  let fileText = "";
  let fileImages: any[] = [];
  if (parsed.fileArgs.length > 0) {
    const fileResult: ProcessedFiles = await processFileArguments(parsed.fileArgs);
    fileText = fileResult.text;
    fileImages = fileResult.images;
  }

  const initialResult: InitialMessageResult = buildInitialMessage({
    parsed,
    fileText: fileText || undefined,
    fileImages: fileImages.length > 0 ? fileImages : undefined,
    stdinContent: undefined, // No stdin pre-read in TTY
  });

  // Send initial and any additional CLI messages
  if (initialResult.initialMessage) {
    await runtime.session.prompt(initialResult.initialMessage, { images: initialResult.initialImages });
  }
  for (const msg of parsed.messages) {
    await runtime.session.prompt(msg);
  }

  // Start TTY interactive mode (this blocks until exit)
  const ttyMode = new TTYMode(runtime);
  await ttyMode.start();

  printTimings();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
