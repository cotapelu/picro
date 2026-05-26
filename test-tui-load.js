// Minimal test to load TUI module (does not render)
(async () => {
  try {
    const { runTui } = await import('./src/tui-bootstrap.js');
    console.log('Bootstrap loaded');
    // Don't actually run the app; just check that import succeeded
  } catch (err) {
    console.error('Failed to load bootstrap:', err);
    process.exit(1);
  }
})();
