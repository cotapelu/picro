// SPDX-License-Identifier: Apache-2.0
/**
 * TUI Mode - Uses pi-coding-agent's InteractiveMode to test our runtime.
 *
 * This mode wraps our AgentSessionRuntime in the reference TUI to verify
 * compatibility without reimplementing the UI.
 */

import { InteractiveMode } from '@earendil-works/pi-coding-agent';

/**
 * Run TUI mode with our runtime implementation.
 *
 * @param runtime - An already-created AgentSessionRuntime to use
 */
export async function runTuiMode(runtime: any): Promise<void> {
  const interactive = new InteractiveMode(runtime as any);
  try {
    console.log('[TUI] initializing...');
    await interactive.init();
    console.log('[TUI] init complete, running...');
    await interactive.run();
  } catch (err) {
    console.error('[TUI] error:', err);
    throw err;
  }
}
