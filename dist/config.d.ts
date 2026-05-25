/**
 * Application configuration constants
 *
 * CommonJS-compatible: uses __dirname for path resolution.
 */
/** Application name (pi or picro) */
export declare const APP_NAME: string;
/** Config directory name (e.g., .pi or .picro) */
export declare const CONFIG_DIR_NAME: string;
/** Agent directory env variable name */
export declare const ENV_AGENT_DIR: string;
/** Application version */
export declare const VERSION: string;
/** Get the agent directory (e.g., ~/.pi/agent) */
export declare function getAgentDir(): string;
/** Get sessions directory */
export declare function getSessionsDir(): string;
/** Get settings path */
export declare function getSettingsPath(): string;
/** Get auth path */
export declare function getAuthPath(): string;
/** Get models path */
export declare function getModelsPath(): string;
//# sourceMappingURL=config.d.ts.map