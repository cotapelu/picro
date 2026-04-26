// SPDX-License-Identifier: Apache-2.0
/**
 * Utils Index - Export all utilities
 */

export { getShellConfig, getShellEnv, killProcessTree } from "./shell.js";
export type { ShellConfig } from "./shell.js";

export { isLocalPath } from "./paths.js";

export { waitForChildProcess } from "./child-process.js";