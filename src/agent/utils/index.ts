// SPDX-License-Identifier: Apache-2.0
/**
 * Utils Index - Export all utilities
 */

export { getShellConfig, getShellEnv, killProcessTree } from "./shell";
export type { ShellConfig } from "./shell";

export { isLocalPath } from "./paths";

export { waitForChildProcess } from "./child-process";