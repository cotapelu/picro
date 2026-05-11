// SPDX-License-Identifier: Apache-2.0
/**
 * Startup migrations for upgrading from older versions.
 * These are safe to run on every startup; they skip if already done.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "./config";

/**
 * Migrate legacy oauth.json and settings.json apiKeys to auth.json.
 * Returns list of provider names that were migrated.
 */
export function migrateAuthToAuthJson(): string[] {
  const agentDir = getAgentDir();
  const authPath = join(agentDir, "auth.json");
  const oauthPath = join(agentDir, "oauth.json");
  const settingsPath = join(agentDir, "settings.json");

  if (existsSync(authPath)) return [];

  const migrated: Record<string, unknown> = {};
  const providers: string[] = [];

  // Migrate oauth.json
  if (existsSync(oauthPath)) {
    try {
      const oauth = JSON.parse(readFileSync(oauthPath, "utf-8"));
      for (const [provider, cred] of Object.entries(oauth)) {
        migrated[provider] = { type: "oauth", ...(cred as object) };
        providers.push(provider);
      }
      renameSync(oauthPath, `${oauthPath}.migrated`);
    } catch {
      // ignore errors
    }
  }

  // Migrate settings.json apiKeys
  if (existsSync(settingsPath)) {
    try {
      const content = readFileSync(settingsPath, "utf-8");
      const settings = JSON.parse(content);
      if (settings.apiKeys && typeof settings.apiKeys === "object") {
        for (const [provider, key] of Object.entries(settings.apiKeys)) {
          if (!migrated[provider] && typeof key === "string") {
            migrated[provider] = { type: "api_key", key };
            providers.push(provider);
          }
        }
        delete settings.apiKeys;
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      }
    } catch {
      // ignore errors
    }
  }

  if (Object.keys(migrated).length > 0) {
    mkdirSync(dirname(authPath), { recursive: true });
    writeFileSync(authPath, JSON.stringify(migrated, null, 2), { mode: 0o600 });
  }

  return providers;
}

/**
 * Migrate sessions from ~/.pi/agent/*.jsonl to proper session directories.
 * This fixes bug where sessions were saved in agent root instead of sessions/<cwd-hash>/.
 */
export function migrateSessionsFromAgentRoot(): number {
  const agentDir = getAgentDir();

  let files: string[];
  try {
    files = readdirSync(agentDir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => join(agentDir, f));
  } catch {
    return 0;
  }

  if (files.length === 0) return 0;

  let moved = 0;
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf8");
      const firstLine = content.split("\n")[0];
      if (!firstLine?.trim()) continue;

      const header = JSON.parse(firstLine);
      if (header.type !== "session" || !header.cwd) continue;

      const cwd: string = header.cwd;
      const safePath = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
      const correctDir = join(agentDir, "sessions", safePath);

      if (!existsSync(correctDir)) {
        mkdirSync(correctDir, { recursive: true });
      }

      const fileName = file.split("/").pop() || file.split("\\").pop();
      const newPath = join(correctDir, fileName!);

      if (existsSync(newPath)) continue;

      renameSync(file, newPath);
      moved++;
    } catch {
      // skip problematic files
    }
  }

  return moved;
}

/**
 * Migrate commands/ to prompts/ if needed.
 */
export function migrateCommandsToPrompts(baseDir: string, label: string): boolean {
  const commandsDir = join(baseDir, "commands");
  const promptsDir = join(baseDir, "prompts");

  if (existsSync(commandsDir) && !existsSync(promptsDir)) {
    try {
      renameSync(commandsDir, promptsDir);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Run all migrations.
 * Returns list of provider names that were migrated (for auth) and warnings.
 */
export function runMigrations(_cwd: string): { migratedAuthProviders: string[]; deprecationWarnings: string[] } {
  const migratedAuthProviders: string[] = [];
  const deprecationWarnings: string[] = [];

  // Auth migration
  try {
    const authMigrated = migrateAuthToAuthJson();
    if (authMigrated.length > 0) {
      migratedAuthProviders.push(...authMigrated);
    }
  } catch {}

  // Session migration
  try {
    const sessionsMoved = migrateSessionsFromAgentRoot();
    if (sessionsMoved > 0) {
      deprecationWarnings.push(`Migrated ${sessionsMoved} session(s) to proper directories.`);
    }
  } catch {}

  // Commands -> Prompts migration (global agent dir)
  try {
    const agentDir = getAgentDir();
    if (migrateCommandsToPrompts(agentDir, "global")) {
      deprecationWarnings.push("Migrated global commands/ to prompts/.");
    }
  } catch {}

  return { migratedAuthProviders, deprecationWarnings };
}

/**
 * Show deprecation warnings in interactive mode.
 */
export async function showDeprecationWarnings(warnings: string[]): Promise<void> {
  if (warnings.length === 0) return;
  for (const w of warnings) {
    console.warn(`⚠️  ${w}`);
  }
}
