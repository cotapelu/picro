// SPDX-License-Identifier: Apache-2.0
/**
 * Shell Utils - Shell configuration and process management
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - getShellConfig - cross-platform shell resolution
 * - getShellEnv - environment with binDir
 * - killProcessTree - kill process and children
 */

import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { delimiter } from "node:path";

export interface ShellConfig {
  shell: string;
  args: string[];
}

function findBashOnPath(): string | null {
  if (process.platform === "win32") {
    try {
      const result = spawnSync("where", ["bash.exe"], { encoding: "utf-8", timeout: 5000 });
      if (result.status === 0 && result.stdout) {
        const firstMatch = result.stdout.trim().split(/\r?\n/)[0];
        if (firstMatch && existsSync(firstMatch)) {
          return firstMatch;
        }
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  // Unix
  try {
    const result = spawnSync("which", ["bash"], { encoding: "utf-8", timeout: 5000 });
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim().split(/\r?\n/)[0];
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export function getShellConfig(customShellPath?: string): ShellConfig {
  // 1. User-specified shell path
  if (customShellPath) {
    if (existsSync(customShellPath)) {
      return { shell: customShellPath, args: ["-c"] };
    }
    throw new Error(`Custom shell path not found: ${customShellPath}`);
  }

  if (process.platform === "win32") {
    // Try Git Bash in known locations
    const programFiles = process.env.ProgramFiles;
    const programFilesX86 = process.env["ProgramFiles(x86)"];
    
    const paths: string[] = [];
    if (programFiles) paths.push(`${programFiles}\\Git\\bin\\bash.exe`);
    if (programFilesX86) paths.push(`${programFilesX86}\\Git\\bin\\bash.exe`);

    for (const path of paths) {
      if (existsSync(path)) {
        return { shell: path, args: ["-c"] };
      }
    }

    // Fallback: search bash on PATH
    const bashOnPath = findBashOnPath();
    if (bashOnPath) {
      return { shell: bashOnPath, args: ["-c"] };
    }

    throw new Error("No bash shell found. Install Git for Windows or add bash to PATH.");
  }

  // Unix
  if (existsSync("/bin/bash")) {
    return { shell: "/bin/bash", args: ["-c"] };
  }

  const bashOnPath = findBashOnPath();
  if (bashOnPath) {
    return { shell: bashOnPath, args: ["-c"] };
  }

  return { shell: "sh", args: ["-c"] };
}

export function getShellEnv(): NodeJS.ProcessEnv {
  const pathKey = Object.keys(process.env).find(k => k.toLowerCase() === "path") ?? "PATH";
  const currentPath = process.env[pathKey] ?? "";
  const pathEntries = currentPath.split(delimiter).filter(Boolean);
  
  return {
    ...process.env,
    [pathKey]: pathEntries.join(delimiter),
  };
}

export function killProcessTree(pid: number): void {
  if (process.platform === "win32") {
    try {
      spawn("taskkill", ["/F", "/T", "/PID", String(pid)], {
        stdio: "ignore",
        detached: true,
      });
    } catch {
      // Ignore errors
    }
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Process already dead
      }
    }
  }
}