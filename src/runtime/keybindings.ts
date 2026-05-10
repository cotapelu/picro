// SPDX-License-Identifier: Apache-2.0
/**
 * Keybindings Manager - Manage keybindings for the application
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ============================================================================
// Types
// ============================================================================

/** Keybinding definition */
export interface Keybinding {
  defaultKeys: string | string[];
  description?: string;
}

/** All app keybindings */
export interface AppKeybindings {
  "app.interrupt": Keybinding;
  "app.clear": Keybinding;
  "app.exit": Keybinding;
  "app.suspend": Keybinding;
  "app.thinking.cycle": Keybinding;
  "app.model.cycleForward": Keybinding;
  "app.model.cycleBackward": Keybinding;
  "app.model.select": Keybinding;
  "app.tools.expand": Keybinding;
  "app.thinking.toggle": Keybinding;
  "app.session.toggleNamedFilter": Keybinding;
  "app.editor.external": Keybinding;
  "app.message.followUp": Keybinding;
  "app.message.dequeue": Keybinding;
  "app.clipboard.pasteImage": Keybinding;
  "app.session.new": Keybinding;
  "app.session.tree": Keybinding;
  "app.session.fork": Keybinding;
  "app.session.resume": Keybinding;
  "app.tree.foldOrUp": Keybinding;
  "app.tree.unfoldOrDown": Keybinding;
  "app.tree.editLabel": Keybinding;
  "app.tree.toggleLabelTimestamp": Keybinding;
  "app.session.togglePath": Keybinding;
  "app.session.toggleSort": Keybinding;
  "app.session.rename": Keybinding;
  "app.session.delete": Keybinding;
  "app.models.save": Keybinding;
  "app.models.enableAll": Keybinding;
  "app.models.clearAll": Keybinding;
  "app.models.toggleProvider": Keybinding;
  "app.tree.filter.default": Keybinding;
  "app.tree.filter.noTools": Keybinding;
  "app.tree.filter.userOnly": Keybinding;
  "app.tree.filter.all": Keybinding;
  "app.tree.filter.cycleForward": Keybinding;
  "app.tree.filter.cycleBackward": Keybinding;
}

export type AppKeybinding = keyof AppKeybindings;

// ============================================================================
// Default Keybindings
// ============================================================================

function isWin(): boolean {
  return process.platform === "win32";
}

/** Default app keybindings */
export const KEYBINDINGS: AppKeybindings = {
  "app.interrupt": { defaultKeys: "escape", description: "Cancel or abort" },
  "app.clear": { defaultKeys: "ctrl+c", description: "Clear editor" },
  "app.exit": { defaultKeys: "ctrl+d", description: "Exit when editor is empty" },
  "app.suspend": { defaultKeys: isWin() ? [] : "ctrl+z", description: "Suspend to background" },
  "app.thinking.cycle": { defaultKeys: "shift+tab", description: "Cycle thinking level" },
  "app.model.cycleForward": { defaultKeys: "ctrl+p", description: "Cycle to next model" },
  "app.model.cycleBackward": { defaultKeys: "ctrl+shift+p", description: "Cycle to previous model" },
  "app.model.select": { defaultKeys: "ctrl+o", description: "Open model selector" },
  "app.tools.expand": { defaultKeys: "ctrl+t", description: "Expand tools panel" },
  "app.thinking.toggle": { defaultKeys: "ctrl+shift+t", description: "Toggle thinking display" },
  "app.session.toggleNamedFilter": { defaultKeys: "ctrl+f", description: "Toggle session filter" },
  "app.editor.external": { defaultKeys: "ctrl+shift+e", description: "Open in external editor" },
  "app.message.followUp": { defaultKeys: "ctrl+enter", description: "Send message" },
  "app.message.dequeue": { defaultKeys: "ctrl+d", description: "Dequeue message" },
  "app.clipboard.pasteImage": { defaultKeys: "ctrl+shift+v", description: "Paste image from clipboard" },
  "app.session.new": { defaultKeys: "ctrl+n", description: "Start new session" },
  "app.session.tree": { defaultKeys: "ctrl+shift+s", description: "Show session tree" },
  "app.session.fork": { defaultKeys: "ctrl+k", description: "Fork session" },
  "app.session.resume": { defaultKeys: "enter", description: "Resume session" },
  "app.tree.foldOrUp": { defaultKeys: "left", description: "Fold or go up" },
  "app.tree.unfoldOrDown": { defaultKeys: "right", description: "Unfold or go down" },
  "app.tree.editLabel": { defaultKeys: "F2", description: "Edit label" },
  "app.tree.toggleLabelTimestamp": { defaultKeys: "ctrl+t", description: "Toggle timestamp" },
  "app.session.togglePath": { defaultKeys: "ctrl+shift+p", description: "Toggle path display" },
  "app.session.toggleSort": { defaultKeys: "ctrl+shift+r", description: "Toggle sort order" },
  "app.session.rename": { defaultKeys: "F2", description: "Rename session" },
  "app.session.delete": { defaultKeys: "ctrl+backspace", description: "Delete session" },
  "app.models.save": { defaultKeys: "ctrl+s", description: "Save models" },
  "app.models.enableAll": { defaultKeys: "ctrl+e", description: "Enable all models" },
  "app.models.clearAll": { defaultKeys: "ctrl+shift+x", description: "Clear all models" },
  "app.models.toggleProvider": { defaultKeys: "ctrl+shift+i", description: "Toggle provider" },
  "app.tree.filter.default": { defaultKeys: "1", description: "Filter: default" },
  "app.tree.filter.noTools": { defaultKeys: "2", description: "Filter: no tools" },
  "app.tree.filter.userOnly": { defaultKeys: "3", description: "Filter: user only" },
  "app.tree.filter.all": { defaultKeys: "5", description: "Filter: all" },
  "app.tree.filter.cycleForward": { defaultKeys: "tab", description: "Cycle filter forward" },
  "app.tree.filter.cycleBackward": { defaultKeys: "shift+tab", description: "Cycle filter backward" },
};

// ============================================================================
// Manager
// ============================================================================

/**
 * Keybindings manager class
 */
export class KeybindingsManager {
  private bindings: Map<string, Keybinding> = new Map();
  private custom: Map<string, Keybinding> = new Map();

  constructor(defaultBindings?: AppKeybindings) {
    this.bindings = new Map(Object.entries(defaultBindings ?? KEYBINDINGS));
  }

  /** Get a keybinding */
  get(name: string): Keybinding | undefined {
    return this.custom.get(name) ?? this.bindings.get(name);
  }

  /** Set a custom keybinding */
  setCustom(name: string, binding: Keybinding): void {
    this.custom.set(name, binding);
  }

  /** Clear custom keybinding */
  clearCustom(name: string): void {
    this.custom.delete(name);
  }

  /** Get all keybindings */
  getAll(): Map<string, Keybinding> {
    return new Map([...this.bindings, ...this.custom]);
  }
}

/**
 * Create a keybindings manager
 */
export function createKeybindingsManager(): KeybindingsManager {
  return new KeybindingsManager(KEYBINDINGS);
}

/**
 * Load custom keybindings from config file
 */
export function loadCustomKeybindings(
  agentDir: string,
  keybindingsManager: KeybindingsManager
): void {
  const configPath = join(agentDir, "keybindings.json");

  if (!existsSync(configPath)) {
    return;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const custom = JSON.parse(content);

    for (const [key, value] of Object.entries(custom)) {
      keybindingsManager.setCustom(key, value as Keybinding);
    }
  } catch (error) {
    console.warn(`Failed to load keybindings from ${configPath}:`, error);
  }
}