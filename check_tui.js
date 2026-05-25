#!/usr/bin/env node
// Quick test to load TUI bundle
try {
  const mod = await import('./tui/InkApp.js');
  console.log('✅ TUI bundle loaded successfully');
  console.log('Has runInkApp?', typeof mod.runInkApp === 'function');
} catch (err) {
  console.error('❌ Failed to load TUI bundle:');
  console.error(err);
}
