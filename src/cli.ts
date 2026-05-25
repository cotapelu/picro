#!/usr/bin/env node
// Launcher script that starts the main application.
// Uses dynamic import to load the main module.
import("./main.js").catch((err: any) => {
  console.error("Failed to start picro:", err);
  process.exit(1);
});
