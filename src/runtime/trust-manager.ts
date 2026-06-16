// SPDX-License-Identifier: Apache-2.0
/**
 * Trust Manager - Project trust decisions
 * Mirrors pi's trust-manager implementation
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import lockfile from "proper-lockfile";

const CONFIG_DIR_NAME = ".pi";

function normalizeCwd(cwd: string): string {
  return cwd; // pi uses canonicalizePath/resolvePath but we'll keep it simple
}

function findNearestTrustEntry(data: Record<string, boolean | null>, cwd: string): { path: string; decision: boolean } | null {
  let currentDir = normalizeCwd(cwd);
  while (true) {
    const value = data[currentDir];
    if (value === true || value === false) {
      return { path: currentDir, decision: value };
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

function readTrustFile(path: string): Record<string, boolean | null> {
  if (!existsSync(path)) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read trust store ${path}: ${message}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid trust store ${path}: expected an object`);
  }
  const data: Record<string, boolean | null> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== true && value !== false && value !== null) {
      throw new Error(`Invalid trust store ${path}: value for ${JSON.stringify(key)} must be true, false, or null`);
    }
    data[key] = value as boolean | null;
  }
  return data;
}

function writeTrustFile(path: string, data: Record<string, boolean | null>): void {
  const sorted: Record<string, boolean | null> = {};
  for (const key of Object.keys(data).sort()) {
    const value = data[key];
    if (value === true || value === false || value === null) {
      sorted[key] = value;
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
}

function acquireTrustLockSync(path: string): () => void {
  const trustDir = dirname(path);
  mkdirSync(trustDir, { recursive: true });
  const maxAttempts = 10;
  const delayMs = 20;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return lockfile.lockSync(trustDir, { realpath: false, lockfilePath: `${path}.lock` });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as Record<string, unknown>).code)
        : undefined;
      if (code !== "ELOCKED" || attempt === maxAttempts) {
        throw error;
      }
      const start = Date.now();
      while (Date.now() - start < delayMs) {
        // Sleep synchronously
      }
    }
  }
  throw new Error("Failed to acquire trust store lock");
}

function withTrustFileLock<T>(path: string, fn: () => T): T {
  const release = acquireTrustLockSync(path);
  try {
    return fn();
  } finally {
    release();
  }
}

export function hasProjectConfigDir(cwd: string): boolean {
  return existsSync(join(normalizeCwd(cwd), CONFIG_DIR_NAME));
}

export function hasProjectTrustInputs(cwd: string): boolean {
  let currentDir = normalizeCwd(cwd);
  if (hasProjectConfigDir(currentDir)) {
    return true;
  }
  while (true) {
    if (existsSync(join(currentDir, ".agents", "skills"))) {
      return true;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return false;
    }
    currentDir = parentDir;
  }
}

export class ProjectTrustStore {
  trustPath: string;

  constructor(agentDir: string) {
    this.trustPath = join(agentDir, "trust.json");
  }

  get(cwd: string): boolean | null {
    return this.getEntry(cwd)?.decision ?? null;
  }

  getEntry(cwd: string): { path: string; decision: boolean } | null {
    return withTrustFileLock(this.trustPath, () => {
      const data = readTrustFile(this.trustPath);
      return findNearestTrustEntry(data, cwd);
    });
  }

  set(cwd: string, decision: boolean): void {
    this.setMany([{ path: cwd, decision }]);
  }

  setMany(decisions: Array<{ path: string; decision: boolean | null }>): void {
    withTrustFileLock(this.trustPath, () => {
      const data = readTrustFile(this.trustPath);
      for (const { path, decision } of decisions) {
        const key = normalizeCwd(path);
        if (decision === null) {
          delete data[key];
        } else {
          data[key] = decision;
        }
      }
      writeTrustFile(this.trustPath, data);
    });
  }
}
