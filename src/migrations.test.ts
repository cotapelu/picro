// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for migrations.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  migrateAuthToAuthJson,
  migrateSessionsFromAgentRoot,
  migrateCommandsToPrompts,
} from "./migrations";
import { ENV_AGENT_DIR } from "./config";

describe("migrations", () => {
  let testAgentDir: string;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    const base = join(tmpdir(), "picro-migrate-" + Math.random().toString(36).substring(2));
    testAgentDir = join(base, ".pi", "agent");
    await fs.mkdir(testAgentDir, { recursive: true });
    originalEnv = process.env[ENV_AGENT_DIR];
    process.env[ENV_AGENT_DIR] = testAgentDir;
  });

  afterEach(async () => {
    // Restore env
    if (originalEnv !== undefined) {
      process.env[ENV_AGENT_DIR] = originalEnv;
    } else {
      delete process.env[ENV_AGENT_DIR];
    }
    // Cleanup
    try {
      const base = join(testAgentDir, "..", "..");
      await fs.rm(base, { recursive: true, force: true });
    } catch {}
  });

  describe("migrateAuthToAuthJson", () => {
    it("should migrate oauth.json to auth.json", async () => {
      const oauthPath = join(testAgentDir, "oauth.json");
      const oauthData = { anthropic: { token: "secret" } };
      await fs.writeFile(oauthPath, JSON.stringify(oauthData));

      const migrated = migrateAuthToAuthJson();
      expect(migrated).toContain("anthropic");

      const authPath = join(testAgentDir, "auth.json");
      await expect(fs.access(authPath)).resolves.toBeUndefined();
      const authContent = JSON.parse(await fs.readFile(authPath, "utf-8"));
      expect(authContent.anthropic.type).toBe("oauth");
      expect(authContent.anthropic.token).toBe("secret");

      // Original should be renamed
      await expect(fs.access(`${oauthPath}.migrated`)).resolves.toBeUndefined();
    });

    it("should migrate settings.json apiKeys", async () => {
      const settingsPath = join(testAgentDir, "settings.json");
      const settings = { apiKeys: { openai: "sk-openai" } };
      await fs.writeFile(settingsPath, JSON.stringify(settings));

      const migrated = migrateAuthToAuthJson();
      expect(migrated).toContain("openai");

      const authPath = join(testAgentDir, "auth.json");
      const authContent = JSON.parse(await fs.readFile(authPath, "utf-8"));
      expect(authContent.openai.type).toBe("api_key");
      expect(authContent.openai.key).toBe("sk-openai");

      // Settings should no longer have apiKeys
      const newSettings = JSON.parse(await fs.readFile(settingsPath, "utf-8"));
      expect(newSettings.apiKeys).toBeUndefined();
    });

    it("should not migrate if auth.json exists", async () => {
      const authPath = join(testAgentDir, "auth.json");
      await fs.writeFile(authPath, JSON.stringify({}));
      const settingsPath = join(testAgentDir, "settings.json");
      await fs.writeFile(settingsPath, JSON.stringify({ apiKeys: { openai: "key" } }));

      const migrated = migrateAuthToAuthJson();
      expect(migrated).toHaveLength(0);

      // Check auth unchanged
      const content = JSON.parse(await fs.readFile(authPath, "utf-8"));
      expect(content).toEqual({});
    });

    it("should merge both sources", async () => {
      await fs.writeFile(join(testAgentDir, "oauth.json"), JSON.stringify({ anthropic: { token: "a" } }));
      await fs.writeFile(join(testAgentDir, "settings.json"), JSON.stringify({ apiKeys: { openai: "b" } }));

      const migrated = migrateAuthToAuthJson();
      expect(migrated.sort()).toEqual(["anthropic", "openai"]);

      const auth = JSON.parse(await fs.readFile(join(testAgentDir, "auth.json"), "utf-8"));
      expect(auth.anthropic.type).toBe("oauth");
      expect(auth.openai.type).toBe("api_key");
    });
  });

  describe("migrateSessionsFromAgentRoot", () => {
    it("should move session file from agent root to sessions/<cwd-hash>/", async () => {
      // Ensure sessions dir does not exist yet
      const sessionFile = join(testAgentDir, "abc123.jsonl");
      const cwd = "/home/user/project";
      const header = { type: "session", version: 3, id: "abc123", timestamp: new Date().toISOString(), cwd };
      const content = `${JSON.stringify(header)}\n{\"type\":\"message\",\"id\":\"m1\",\"parentId\":null,\"timestamp\":\"...\",\"message\":{\"role\":\"user\",\"content\":\"hi\"}}\n`;
      await fs.writeFile(sessionFile, content);

      const moved = migrateSessionsFromAgentRoot();
      expect(moved).toBe(1);

      const safePath = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
      const targetDir = join(testAgentDir, "sessions", safePath);
      const targetFile = join(targetDir, sessionFile.split("/").pop()!);
      await expect(fs.access(targetFile)).resolves.toBeUndefined();
    });

    it("should skip files without valid session header", async () => {
      const file = join(testAgentDir, "notasession.jsonl");
      await fs.writeFile(file, "not json\nlines");

      const moved = migrateSessionsFromAgentRoot();
      expect(moved).toBe(0);
    });

    it("should not move if target already exists", async () => {
      const cwd = "/home/user/project";
      const safePath = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
      const targetDir = join(testAgentDir, "sessions", safePath);
      await fs.mkdir(targetDir, { recursive: true });
      const existingTarget = join(targetDir, "existing.jsonl");
      await fs.writeFile(existingTarget, "existing");

      const sessionFile = join(testAgentDir, "existing.jsonl");
      const header = { type: "session", version: 3, id: "existing", timestamp: new Date().toISOString(), cwd };
      await fs.writeFile(sessionFile, JSON.stringify(header));

      const moved = migrateSessionsFromAgentRoot();
      expect(moved).toBe(0);
      // Original still there
      await expect(fs.access(sessionFile)).resolves.toBeUndefined();
    });
  });

  describe("migrateCommandsToPrompts", () => {
    it("should rename commands/ to prompts/", async () => {
      const base = join(testAgentDir, "userproject");
      await fs.mkdir(join(base, "commands"), { recursive: true });
      await fs.writeFile(join(base, "commands", "test.md"), "# test");

      const changed = migrateCommandsToPrompts(base, "test");
      expect(changed).toBe(true);
      await expect(fs.access(join(base, "prompts", "test.md"))).resolves.toBeUndefined();
    });

    it("should not run if prompts/ already exists", async () => {
      const base = join(testAgentDir, "userproject");
      await fs.mkdir(join(base, "commands"), { recursive: true });
      await fs.mkdir(join(base, "prompts"), { recursive: true });

      const changed = migrateCommandsToPrompts(base, "test");
      expect(changed).toBe(false);
    });
  });
});
