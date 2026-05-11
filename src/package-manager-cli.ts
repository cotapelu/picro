// SPDX-License-Identifier: Apache-2.0
/**
 * Package Manager CLI - handle install/remove/update/list commands.
 * Called from main.ts when args start with these commands.
 */

import { join } from "node:path";
import { getAgentDir } from "./config";
import { SettingsManager } from "./runtime/settings-manager";
import { PackageManager } from "./core/package-manager";

export type PackageCommand = "install" | "remove" | "uninstall" | "update" | "list";

/**
 * Parse command line arguments for package commands.
 * Returns undefined if not a package command.
 */
export function parsePackageCommand(args: string[]): { command: PackageCommand; source?: string; local: boolean; help: boolean } | undefined {
  if (args.length === 0) return undefined;

  const cmd = args[0];
  if (!["install", "remove", "uninstall", "update", "list"].includes(cmd)) {
    return undefined;
  }

  const command = cmd === "uninstall" ? "remove" : (cmd as PackageCommand);
  let local = false;
  let help = false;
  let source: string | undefined;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }
    if (arg === "-l" || arg === "--local") {
      local = true;
      continue;
    }
    if (arg.startsWith("-")) {
      // ignore other flags for now
      continue;
    }
    if (!source) {
      source = arg;
    }
  }

  return { command, source, local, help };
}

/**
 * Handle package commands. Returns true if command was handled.
 */
export async function handleConfigCommand(args: string[]): Promise<boolean> {
  if (args[0] !== "config") {
    return false;
  }

  const sub = args[1];
  if (sub === "--help" || sub === "-h" || args.length === 1) {
    printConfigHelp();
    return true;
  }

  const cwd = process.cwd();
  const agentDir = getAgentDir();
  const settingsManager = SettingsManager.create(cwd, agentDir);
  const packageManager = new PackageManager({ cwd, agentDir, settingsManager });

  if (sub === "install") {
    const source = args[2];
    if (!source) {
      console.error("Error: missing source");
      printConfigHelp();
      return true;
    }
    const result = await packageManager.install(source, false);
    if (result.ok) {
      console.log(`Installed: ${source}`);
    } else {
      console.error(`Error: ${result.error}`);
    }
    return true;
  }

  if (sub === "remove" || sub === "uninstall") {
    const source = args[2];
    if (!source) {
      console.error("Error: missing source");
      printConfigHelp();
      return true;
    }
    const result = await packageManager.remove(source, false);
    if (result.ok) {
      console.log(`Removed: ${source}`);
    } else {
      console.error(`Error: ${result.error}`);
    }
    return true;
  }

  if (sub === "update") {
    const source = args[2];
    const result = await packageManager.update(source);
    if (result.ok) {
      if (source) {
        console.log(`Updated: ${source}`);
      } else {
        console.log("All packages up to date.");
      }
    } else {
      console.error(`Error: ${result.error}`);
    }
    return true;
  }

  if (sub === "list") {
    const packages = packageManager.list();
    if (packages.length === 0) {
      console.log("No packages installed.");
    } else {
      for (const p of packages) {
        console.log(p);
      }
    }
    return true;
  }

  console.error(`Unknown config command: ${sub}`);
  printConfigHelp();
  return true;
}

function printConfigHelp(): void {
  console.log(`picro config commands:

  picro config install <source>   Add a package source to settings
  picro config remove <source>   Remove a package source
  picro config uninstall <source>  Alias for remove
  picro config update [source]   Update package(s)
  picro config list              List installed packages

Examples:
  picro config install npm:@foo/bar
  picro config install git:github.com/user/repo
  picro config remove npm:@foo/bar
`);
}
