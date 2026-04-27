// SPDX-License-Identifier: Apache-2.0
/**
 * Telemetry - Check if telemetry is enabled
 */

import type { SettingsManager } from "./settings-manager.js";

/**
 * Check if an environment flag is truthy
 */
function isTruthyEnvFlag(value: string | undefined): boolean {
  if (!value) return false;
  return (
    value === "1" ||
    value.toLowerCase() === "true" ||
    value.toLowerCase() === "yes"
  );
}

/**
 * Check if install telemetry is enabled
 */
export function isInstallTelemetryEnabled(
  settingsManager: SettingsManager,
  telemetryEnv: string | undefined = process.env.PI_TELEMETRY
): boolean {
  // Check environment variable first
  if (telemetryEnv !== undefined) {
    return isTruthyEnvFlag(telemetryEnv);
  }
  
  // Fall back to settings
  return settingsManager.getEnableInstallTelemetry();
}

/**
 * Check if usage telemetry is enabled
 */
export function isUsageTelemetryEnabled(
  telemetryEnv: string | undefined = process.env.PI_TELEMETRY
): boolean {
  return isTruthyEnvFlag(telemetryEnv);
}