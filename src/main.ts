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
import { listSlashCommands } from "./runtime/slash-commands.js";
import { resolveCliModel } from "./session/model-resolver.js";
import { createAgentSessionServices } from "./session/agent-session-services.js";
import { createAgentSessionFromServices, type SessionStartEvent } from "./session/agent-session-services.js";
import { SessionManager } from "./session/session-manager.js";
import { AgentSessionRuntime } from "./runtime/agent-session-runtime.js";
import { getAgentDir, VERSION } from "./config.js";
import { resetTimings, time, printTimings } from "./utils/timings.js";
import { handleConfigCommand } from "./package-manager-cli.js";
import { runMigrations, showDeprecationWarnings } from "./migrations.js";
import type { Model } from "./llm/index.js";
import { startInteractiveApp } from "./tui/ink/interactive-app.js";
import { InteractiveController } from "./modes/interactive/interactive-controller.js";
import { createAgentSessionRuntime } from "./runtime/agent-session-runtime.js";
import { startHttpServer } from "./modes/http/index.js";

/**
 * Đăng ký nhận sự kiện phiên (chỉ dùng khi bật VERBOSE).
 *
 * Bản cũ ghi console.log('[DEBUG]...') KHÔNG điều kiện: 9 dòng log chạy ở mọi
 * lần khởi động, ghi đè lên output của Ink (TUI fullscreen) và làm nhiễu stdout
 * khi người ta pipe kết quả đi. Giờ chỉ log khi thực sự bật debug.
 */
function subscribeToSessionEvents(runtime: AgentSessionRuntime): void {
  if (!runtime || typeof runtime.subscribe !== 'function') return;
  runtime.subscribe((event: any) => {
    if (!process.env.VERBOSE) return;
    // eslint-disable-next-line no-console
    console.error(`[picro] ${event.type}`);
    if (event.type === 'message_end') {
      const msgs = (runtime.messages as any[]) || [];
      const lastAssistant = [...msgs].reverse().find((m: any) => m?.role === 'assistant');
      const text = lastAssistant
        ? (Array.isArray(lastAssistant.content)
            ? lastAssistant.content.filter((c: any) => c?.type === 'text').map((c: any) => c?.text ?? '').join('\n')
            : String(lastAssistant.content ?? ''))
        : '';
      if (text) console.error('');
    }
  });
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

  // Resolve model through the model resolver: it understands "provider/id",
  // "provider/id:thinking" patterns and -latest aliases, and reports a clear
  // error. Calling registry.find() directly skipped all of that, so a documented
  // pattern like "openai/gpt-5.4:high" only ever produced "Model not found".
  let resolvedModel: Model | undefined;
  let resolvedThinkingLevel = parsed.thinking;
  if (parsed.model) {
    const resolved = await resolveCliModel({
      initialModel: parsed.model,
      registry: services.modelRegistry,
    });
    if (resolved.error || !resolved.model) {
      console.error(resolved.error || `Model not found: ${parsed.model}`);
      process.exit(1);
    }
    resolvedModel = resolved.model as unknown as Model;
    if (resolved.thinkingLevel && !parsed.thinking) {
      resolvedThinkingLevel = resolved.thinkingLevel as typeof resolvedThinkingLevel;
    }
    if (resolved.warning) {
      console.error(`Warning: ${resolved.warning}`);
    }
  }

  // Create session
  const session = await createAgentSessionFromServices({
    services,
    sessionManager,
    sessionStartEvent,
    model: resolvedModel,
    thinkingLevel: resolvedThinkingLevel,
    // --no-tools / --no-builtin-tools were parsed but never forwarded, so both
    // flags silently did nothing.
    noTools: parsed.noTools ? "all" : undefined,
    noBuiltinTools: parsed.noBuiltinTools,
  });
  time("createAgentSession");

  // Construct runtime
  const runtime = new AgentSessionRuntime(session.agent, session, services);

  // Subscribe to events EARLY - before sending any messages
  subscribeToSessionEvents(runtime);

  // Graceful shutdown: LUÔN dispose runtime (bản cũ chỉ dispose trong handler
  // signal, nên thoát thường — EOF, /quit, Ink unmount — không bao giờ gọi và
  // session file có thể không được flush).
  let disposed = false;
  const disposeRuntime = async (): Promise<void> => {
    if (disposed) return;
    disposed = true;
    try { await runtime.dispose(); } catch { /* dispose is best-effort */ }
  };
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    await disposeRuntime();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGHUP', () => void shutdown('SIGHUP'));
  process.once('exit', () => { void disposeRuntime(); });
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

  const controller = new InteractiveController({ runtime });

  // Chọn mode: TTY (Ink) hoặc HTTP API
  if (parsed.mode === "http" || parsed.mode === "rpc") {
    const port = parsed.port || 3000;
    const host = parsed.host || "0.0.0.0";

    startHttpServer({
      port,
      host,
      runtime,
      controller,
    }).then(() => {
      console.log(`HTTP API server running on ${host}:${port}`);
    }).catch((err) => {
      console.error("Failed to start HTTP server:", err);
      process.exit(1);
    });
  } else {
    // Default: Ink TUI mode
    // Cung cấp danh sách lệnh slash built-in cho gợi ý trong ô nhập.
    (globalThis as { __PICRO_SLASH_COMMANDS__?: Array<{ name: string; description?: string }> }).__PICRO_SLASH_COMMANDS__ =
      listSlashCommands();
    startInteractiveApp({
      runtime,
      controller,
      initialMessage: initialResult.initialMessage,
    });
  }

  printTimings();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
