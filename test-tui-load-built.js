// Test loading the TUI bundle via bootstrap
(async () => {
  try {
    const { runTui } = await import('./dist/tui-bootstrap.js');
    console.log('Bootstrap loaded successfully');
    // Try to get the module to see if it initializes without error
    // Just check that the import of the TUI bundle works
    // We won't call runTui because it requires a proper runtime.
  } catch (err) {
    console.error('Error loading TUI bootstrap:', err);
    process.exit(1);
  }
})();
