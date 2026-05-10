// SPDX-License-Identifier: Apache-2.0
/**
 * Slash Commands - Built-in commands list
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - Built-in commands: settings, model, export, import, share, etc.
 */

export interface SlashCommandInfo {
  name: string;
  description: string;
}

export const BUILTIN_SLASH_COMMANDS: SlashCommandInfo[] = [
  { name: "settings", description: "Open settings menu" },
  { name: "model", description: "Select model (opens selector UI)" },
  { name: "scoped-models", description: "Enable/disable models for cycling" },
  { name: "export", description: "Export session to HTML" },
  { name: "import", description: "Import and resume a session from JSONL" },
  { name: "share", description: "Share session as secret GitHub gist" },
  { name: "copy", description: "Copy last agent message to clipboard" },
  { name: "name", description: "Set session display name" },
  { name: "session", description: "Show session info and stats" },
  { name: "changelog", description: "Show changelog entries" },
  { name: "hotkeys", description: "Show all keyboard shortcuts" },
  { name: "fork", description: "Create a new fork from a previous user message" },
  { name: "clone", description: "Duplicate current session at current position" },
  { name: "tree", description: "Navigate session tree (switch branches)" },
  { name: "login", description: "Configure provider authentication" },
  { name: "logout", description: "Remove provider authentication" },
  { name: "new", description: "Start a new session" },
  { name: "compact", description: "Manually compact the session context" },
  { name: "resume", description: "Resume a different session" },
  { name: "reload", description: "Reload keybindings, extensions, skills, prompts, and themes" },
  { name: "quit", description: "Quit the application" },
];

export function getSlashCommand(name: string): SlashCommandInfo | undefined {
  return BUILTIN_SLASH_COMMANDS.find(cmd => cmd.name === name);
}

export function listSlashCommands(): SlashCommandInfo[] {
  return BUILTIN_SLASH_COMMANDS;
}