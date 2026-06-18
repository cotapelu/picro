/**
 * TUI Bootstrap (ESM)
 * Provides a function to start the Ink app.
 * This file is NOT processed by TypeScript; it's hand-written JS.
 */

export async function runTui(runtime) {
  // Dynamically import the ESM TUI bundle
  const { runInkApp } = await import('./tui/ink/index.js');
  await runInkApp(runtime);
}
