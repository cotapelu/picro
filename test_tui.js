#!/usr/bin/env node
// Test import of TUI bundle
import('./tui/InkApp.js').then(m => {
  console.log('Loaded TUI bundle');
  console.log('Has runInkApp?', typeof m.runInkApp);
}).catch(err => {
  console.error('Failed to load TUI bundle:', err);
});
