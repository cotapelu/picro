// SPDX-License-Identifier: Apache-2.0
/**
 * Application configuration constants
 *
 * CommonJS-compatible: uses __dirname for path resolution.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as os from "node:os";
/** __dirname is provided by Node.js in CommonJS modules */
function getPackageDir() {
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
    }
    catch (e) {
        return {};
    }
}
const pkg = readPackageJson();
/** Application name (pi or picro) */
export const APP_NAME = pkg.piConfig?.name || "picro";
/** Config directory name (e.g., .pi or .picro) */
export const CONFIG_DIR_NAME = pkg.piConfig?.configDir || ".pi";
/** Agent directory env variable name */
export const ENV_AGENT_DIR = `${APP_NAME.toUpperCase()}_AGENT_DIR`;
/** Application version */
export const VERSION = pkg.version || "0.0.0";
/** Get the agent directory (e.g., ~/.pi/agent) */
export function getAgentDir() {
    const envDir = process.env[ENV_AGENT_DIR];
    if (envDir) {
        if (envDir === "~")
            return os.homedir();
        if (envDir.startsWith("~/"))
            return os.homedir() + envDir.slice(1);
        return envDir;
    }
    return join(os.homedir(), CONFIG_DIR_NAME, "agent");
}
/** Get sessions directory */
export function getSessionsDir() {
    return join(getAgentDir(), "sessions");
}
/** Get settings path */
export function getSettingsPath() {
    return join(getAgentDir(), "settings.json");
}
/** Get auth path */
export function getAuthPath() {
    return join(getAgentDir(), "auth.json");
}
/** Get models path */
export function getModelsPath() {
    return join(getAgentDir(), "models.json");
}
//# sourceMappingURL=config.js.map