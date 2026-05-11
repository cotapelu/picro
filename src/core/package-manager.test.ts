// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for package-manager.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PackageManager } from "./package-manager";
import { SettingsManager } from "../runtime/settings-manager";

describe("PackageManager", () => {
  let testDir: string;
  let agentDir: string;
  let settingsPath: string;
  let settingsManager: SettingsManager;
  let pkgManager: PackageManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), "picro-test-" + Math.random().toString(36).substring(2));
    agentDir = join(testDir, ".pi", "agent");
    await fs.mkdir(agentDir, { recursive: true });
    settingsPath = join(agentDir, "settings.json");
    // Create empty settings file
    await fs.writeFile(settingsPath, JSON.stringify({}));
    settingsManager = SettingsManager.create(testDir, agentDir);
    pkgManager = new PackageManager({ cwd: testDir, agentDir, settingsManager });
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  it("should install a package source", async () => {
    const result = await pkgManager.install("npm:@foo/bar");
    expect(result.ok).toBe(true);
    const packages = pkgManager.list();
    expect(packages).toContain("npm:@foo/bar");
  });

  it("should not install duplicate", async () => {
    await pkgManager.install("npm:@foo/bar");
    const result = await pkgManager.install("npm:@foo/bar");
    expect(result.ok).toBe(true);
    const packages = pkgManager.list();
    expect(packages.filter(p => p === "npm:@foo/bar")).toHaveLength(1);
  });

  it("should remove a package source", async () => {
    await pkgManager.install("npm:@foo/bar");
    const result = await pkgManager.remove("npm:@foo/bar");
    expect(result.ok).toBe(true);
    const packages = pkgManager.list();
    expect(packages).not.toContain("npm:@foo/bar");
  });

  it("should return error when removing non-existent source", async () => {
    const result = await pkgManager.remove("nonexistent");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Source not found: nonexistent");
  });

  it("should update a package source", async () => {
    await pkgManager.install("npm:@foo/bar");
    const result = await pkgManager.update("npm:@foo/bar");
    expect(result.ok).toBe(true);
    expect(result.updated).toBe(1);
  });

  it("should return error when updating non-existent source", async () => {
    const result = await pkgManager.update("nonexistent");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Source not found: nonexistent");
  });
});
