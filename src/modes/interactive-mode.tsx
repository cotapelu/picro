// Interactive mode using Ink TUI
// Entry point for running the agent in an interactive terminal UI

import React from 'react';
import { render } from 'ink';
import type { AgentSessionRuntimeOptions } from '../runtime/index.js';
import { createAgentSessionRuntime } from '../runtime/index.js';
import { InkApp } from '../tui/ink/InkApp.js';
import { checkVersion } from '../interactive/version-check.js';

/**
 * Run interactive mode with Ink TUI
 */
export async function runInteractiveMode(options: AgentSessionRuntimeOptions = {}): Promise<void> {
  const runtime = await createAgentSessionRuntime(options);
  // Optional: bind extensions, setup signal handlers
  setupSignalHandlers(runtime);
  // Check for version updates
  await checkVersion();
  // Render InkApp
  render(<InkApp runtime={runtime} />);
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers(runtime: any): void {
  const handleSignal = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    try {
      await runtime.dispose?.();
    } catch (err) {
      console.error('Error during shutdown:', err);
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGHUP', () => handleSignal('SIGHUP'));

  const handleCont = () => {
    console.log('Resumed from suspend');
  };
  process.on('SIGCONT', handleCont);

  // Return cleanup function (optional)
  return () => {
    process.off('SIGTERM', handleSignal);
    process.off('SIGHUP', handleSignal);
    process.off('SIGCONT', handleCont);
  };
}

// Default export
export default runInteractiveMode;
