/**
 * TUI Bootstrap (CommonJS)
 * Provides a function to start the Ink app.
 * This file is NOT processed by TypeScript; it's hand-written JS to avoid import() transformation.
 */

async function runTui(runtime) {
  // Dynamically import the ESM TUI bundle
  const { runInkApp } = await import('./tui/ink/index.js');
  await runInkApp(runtime);
}

module.exports = { runTui };
