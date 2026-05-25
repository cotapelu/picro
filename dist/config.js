"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Application configuration constants
 *
 * CommonJS-compatible: uses __dirname for path resolution.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.ENV_AGENT_DIR = exports.CONFIG_DIR_NAME = exports.APP_NAME = void 0;
exports.getAgentDir = getAgentDir;
exports.getSessionsDir = getSessionsDir;
exports.getSettingsPath = getSettingsPath;
exports.getAuthPath = getAuthPath;
exports.getModelsPath = getModelsPath;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const os = __importStar(require("node:os"));
/** __dirname is provided by Node.js in CommonJS modules */
function getPackageDir() {
    let dir = __dirname;
    while (dir !== (0, node_path_1.dirname)(dir)) {
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(dir, "package.json"))) {
            return dir;
        }
        dir = (0, node_path_1.dirname)(dir);
    }
    return __dirname;
}
/** Read package.json */
function readPackageJson() {
    const pkgPath = (0, node_path_1.join)(getPackageDir(), "package.json");
    try {
        return JSON.parse((0, node_fs_1.readFileSync)(pkgPath, "utf-8"));
    }
    catch (e) {
        return {};
    }
}
const pkg = readPackageJson();
/** Application name (pi or picro) */
exports.APP_NAME = pkg.piConfig?.name || "picro";
/** Config directory name (e.g., .pi or .picro) */
exports.CONFIG_DIR_NAME = pkg.piConfig?.configDir || ".pi";
/** Agent directory env variable name */
exports.ENV_AGENT_DIR = `${exports.APP_NAME.toUpperCase()}_AGENT_DIR`;
/** Application version */
exports.VERSION = pkg.version || "0.0.0";
/** Get the agent directory (e.g., ~/.pi/agent) */
function getAgentDir() {
    const envDir = process.env[exports.ENV_AGENT_DIR];
    if (envDir) {
        if (envDir === "~")
            return os.homedir();
        if (envDir.startsWith("~/"))
            return os.homedir() + envDir.slice(1);
        return envDir;
    }
    return (0, node_path_1.join)(os.homedir(), exports.CONFIG_DIR_NAME, "agent");
}
/** Get sessions directory */
function getSessionsDir() {
    return (0, node_path_1.join)(getAgentDir(), "sessions");
}
/** Get settings path */
function getSettingsPath() {
    return (0, node_path_1.join)(getAgentDir(), "settings.json");
}
/** Get auth path */
function getAuthPath() {
    return (0, node_path_1.join)(getAgentDir(), "auth.json");
}
/** Get models path */
function getModelsPath() {
    return (0, node_path_1.join)(getAgentDir(), "models.json");
}
//# sourceMappingURL=config.js.map