// SPDX-License-Identifier: Apache-2.0
/**
 * Settings Validator - Validate settings values to prevent invalid configurations
 */

import type { Settings } from './settings-manager.js';

/**
 * Validation error
 */
export interface SettingsValidationError {
  field: string;
  message: string;
}

/**
 * Validate settings object
 * @returns empty array if valid, otherwise list of errors
 */
export function validateSettings(settings: Settings): SettingsValidationError[] {
  const errors: SettingsValidationError[] = [];

  // defaultProvider must be string if present
  if (settings.defaultProvider !== undefined && typeof settings.defaultProvider !== 'string') {
    errors.push({ field: 'defaultProvider', message: 'must be a string' });
  }

  // defaultModel must be string if present
  if (settings.defaultModel !== undefined && typeof settings.defaultModel !== 'string') {
    errors.push({ field: 'defaultModel', message: 'must be a string' });
  }

  // steeringMode must be one of allowed values
  if (settings.steeringMode !== undefined) {
    const allowed = ['all', 'one-at-a-time'];
    if (!allowed.includes(settings.steeringMode)) {
      errors.push({ field: 'steeringMode', message: `must be one of ${allowed.join(', ')}` });
    }
  }

  // transport must be one of allowed values
  if (settings.transport !== undefined) {
    const allowed = ['sse', 'websocket', 'polling'];
    if (!allowed.includes(settings.transport)) {
      errors.push({ field: 'transport', message: `must be one of ${allowed.join(', ')}` });
    }
  }

  // followUpMode must be one of allowed values
  if (settings.followUpMode !== undefined) {
    const allowed = ['all', 'one-at-a-time'];
    if (!allowed.includes(settings.followUpMode)) {
      errors.push({ field: 'followUpMode', message: `must be one of ${allowed.join(', ')}` });
    }
  }

  // compaction settings
  if (settings.compaction) {
    if (settings.compaction.enabled !== undefined && typeof settings.compaction.enabled !== 'boolean') {
      errors.push({ field: 'compaction.enabled', message: 'must be a boolean' });
    }
    if (settings.compaction.reserveTokens !== undefined && (typeof settings.compaction.reserveTokens !== 'number' || settings.compaction.reserveTokens < 0)) {
      errors.push({ field: 'compaction.reserveTokens', message: 'must be a non-negative number' });
    }
    if (settings.compaction.keepRecentTokens !== undefined && (typeof settings.compaction.keepRecentTokens !== 'number' || settings.compaction.keepRecentTokens < 0)) {
      errors.push({ field: 'compaction.keepRecentTokens', message: 'must be a non-negative number' });
    }
  }

  // branchSummary settings
  if (settings.branchSummary) {
    if (settings.branchSummary.reserveTokens !== undefined && (typeof settings.branchSummary.reserveTokens !== 'number' || settings.branchSummary.reserveTokens < 0)) {
      errors.push({ field: 'branchSummary.reserveTokens', message: 'must be a non-negative number' });
    }
    if (settings.branchSummary.skipPrompt !== undefined && typeof settings.branchSummary.skipPrompt !== 'boolean') {
      errors.push({ field: 'branchSummary.skipPrompt', message: 'must be a boolean' });
    }
  }

  // retry settings
  if (settings.retry) {
    if (settings.retry.enabled !== undefined && typeof settings.retry.enabled !== 'boolean') {
      errors.push({ field: 'retry.enabled', message: 'must be a boolean' });
    }
    if (settings.retry.maxRetries !== undefined && (typeof settings.retry.maxRetries !== 'number' || settings.retry.maxRetries < 0)) {
      errors.push({ field: 'retry.maxRetries', message: 'must be a non-negative number' });
    }
    if (settings.retry.baseDelayMs !== undefined && (typeof settings.retry.baseDelayMs !== 'number' || settings.retry.baseDelayMs <= 0)) {
      errors.push({ field: 'retry.baseDelayMs', message: 'must be a positive number' });
    }
    if (settings.retry.maxDelayMs !== undefined && (typeof settings.retry.maxDelayMs !== 'number' || settings.retry.maxDelayMs <= 0)) {
      errors.push({ field: 'retry.maxDelayMs', message: 'must be a positive number' });
    }
  }

  // terminal settings
  if (settings.terminal) {
    if (settings.terminal.showImages !== undefined && typeof settings.terminal.showImages !== 'boolean') {
      errors.push({ field: 'terminal.showImages', message: 'must be a boolean' });
    }
    if (settings.terminal.imageWidthCells !== undefined && (typeof settings.terminal.imageWidthCells !== 'number' || settings.terminal.imageWidthCells <= 0)) {
      errors.push({ field: 'terminal.imageWidthCells', message: 'must be a positive number' });
    }
    if (settings.terminal.clearOnShrink !== undefined && typeof settings.terminal.clearOnShrink !== 'boolean') {
      errors.push({ field: 'terminal.clearOnShrink', message: 'must be a boolean' });
    }
    if (settings.terminal.showTerminalProgress !== undefined && typeof settings.terminal.showTerminalProgress !== 'boolean') {
      errors.push({ field: 'terminal.showTerminalProgress', message: 'must be a boolean' });
    }
  }

  // image settings
  if (settings.images) {
    if (settings.images.autoResize !== undefined && typeof settings.images.autoResize !== 'boolean') {
      errors.push({ field: 'images.autoResize', message: 'must be a boolean' });
    }
    if (settings.images.blockImages !== undefined && typeof settings.images.blockImages !== 'boolean') {
      errors.push({ field: 'images.blockImages', message: 'must be a boolean' });
    }
  }

  // defaultThinkingLevel must be one of allowed
  if (settings.defaultThinkingLevel !== undefined) {
    const allowed = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    if (!allowed.includes(settings.defaultThinkingLevel)) {
      errors.push({ field: 'defaultThinkingLevel', message: `must be one of ${allowed.join(', ')}` });
    }
  }

  return errors;
}

/**
 * Validate settings and throw if invalid
 */
export function validateOrThrow(settings: Settings): void {
  const errors = validateSettings(settings);
  if (errors.length > 0) {
    const messages = errors.map(e => `${e.field}: ${e.message}`).join('; ');
    throw new Error(`Invalid settings: ${messages}`);
  }
}
