// Crash Log - ghi log crash để báo cáo lỗi
// Bắt chước pi-mono core/crash-log.ts

import { readFileSync, writeFileSync, existsSync, unlinkSync, appendFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { homedir } from "os";

const CRASH_LOG_DIR = resolve(homedir(), ".pi", "agent", "crashes");
const MAX_CRASHES = 10;

export interface CrashEntry {
  timestamp: string;
  message: string;
  stack?: string;
  version: string;
  platform: string;
  nodeVersion: string;
  cwd: string;
}

function ensureCrashDir(): void {
  if (!existsSync(CRASH_LOG_DIR)) {
    mkdirSync(CRASH_LOG_DIR, { recursive: true });
  }
}

function getCrashLogPath(): string {
  return resolve(CRASH_LOG_DIR, "latest.json");
}

/** Ghi một crash vào log. */
export function recordCrash(error: Error, version: string = "unknown"): void {
  ensureCrashDir();
  const entry: CrashEntry = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    version,
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
  };
  writeFileSync(getCrashLogPath(), JSON.stringify(entry, null, 2), "utf8");
}

/** Đọc crash log chưa thông báo. */
export function takeUnnotifiedCrash(): CrashEntry | undefined {
  const path = getCrashLogPath();
  if (!existsSync(path)) return undefined;
  try {
    const entry = JSON.parse(readFileSync(path, "utf8")) as CrashEntry;
    unlinkSync(path);
    return entry;
  } catch {
    return undefined;
  }
}

/** Đọc crash log (không xóa). */
export function readCrashLog(): CrashEntry | undefined {
  const path = getCrashLogPath();
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CrashEntry;
  } catch {
    return undefined;
  }
}

/** Xóa crash log. */
export function clearCrashLog(): void {
  const path = getCrashLogPath();
  if (existsSync(path)) unlinkSync(path);
}

/** Tìm các extension khớp stack frame. */
export function findExtensionStackMatches(stack: string | undefined): readonly string[] | undefined {
  if (!stack) return undefined;
  const matches: string[] = [];
  // This would need extension info from the runtime
  return matches.length > 0 ? matches : undefined;
}