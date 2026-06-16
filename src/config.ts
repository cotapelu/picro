// SPDX-License-Identifier: Apache-2.0
/**
 * Application configuration constants
 *
 * ESM-compatible: uses import.meta.url for path resolution.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Get package directory by walking up from __dirname */
function getPackageDir(): string {
  let dir = __dirname;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return __dirname;
}

/** Read package.json */
function readPackageJson() {
  const pkgPath = join(getPackageDir(), "package.json");
  try {
    return JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch (e) {
    return {};
  }
}

const pkg = readPackageJson();

/** Application name (pi or picro) */
export const APP_NAME: string = pkg.piConfig?.name || "picro";

/** Config directory name (e.g., .pi or .picro) */
export const CONFIG_DIR_NAME: string = pkg.piConfig?.configDir || ".pi";

/** Agent directory env variable name */
export const ENV_AGENT_DIR: string = `${APP_NAME.toUpperCase()}_AGENT_DIR`;

/** Application version */
export const VERSION: string = pkg.version || "0.0.0";

/** Get the agent directory (e.g., ~/.pi/agent) */
export function getAgentDir(): string {
  const envDir = process.env[ENV_AGENT_DIR];
  if (envDir) {
    if (envDir === "~") return os.homedir();
    if (envDir.startsWith("~/")) return os.homedir() + envDir.slice(1);
    return envDir;
  }
  return join(os.homedir(), CONFIG_DIR_NAME, "agent");
}

/** Get sessions directory */
export function getSessionsDir(): string {
  return join(getAgentDir(), "sessions");
}

/** Get settings path */
export function getSettingsPath(): string {
  return join(getAgentDir(), "settings.json");
}

/** Get auth path */
export function getAuthPath(): string {
  return join(getAgentDir(), "auth.json");
}

/** Get models path */
export function getModelsPath(): string {
  return join(getAgentDir(), "models.json");
}
