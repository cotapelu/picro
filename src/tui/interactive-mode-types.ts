// SPDX-License-Identifier: Apache-2.0
/**
 * InteractiveMode types
 */

export interface InteractiveModeOptions {
  inputPlaceholder?: string;
  initialStatus?: string;
  model?: string;
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}