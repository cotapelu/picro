"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Keybindings Manager - Manage keybindings for the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeybindingsManager = exports.KEYBINDINGS = void 0;
exports.createKeybindingsManager = createKeybindingsManager;
exports.loadCustomKeybindings = loadCustomKeybindings;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
// ============================================================================
// Default Keybindings
// ============================================================================
function isWin() {
    return process.platform === "win32";
}
/** Default app keybindings */
exports.KEYBINDINGS = {
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
class KeybindingsManager {
    bindings = new Map();
    custom = new Map();
    constructor(defaultBindings) {
        this.bindings = new Map(Object.entries(defaultBindings ?? exports.KEYBINDINGS));
    }
    /** Get a keybinding */
    get(name) {
        return this.custom.get(name) ?? this.bindings.get(name);
    }
    /** Set a custom keybinding */
    setCustom(name, binding) {
        this.custom.set(name, binding);
    }
    /** Clear custom keybinding */
    clearCustom(name) {
        this.custom.delete(name);
    }
    /** Get all keybindings */
    getAll() {
        return new Map([...this.bindings, ...this.custom]);
    }
}
exports.KeybindingsManager = KeybindingsManager;
/**
 * Create a keybindings manager
 */
function createKeybindingsManager() {
    return new KeybindingsManager(exports.KEYBINDINGS);
}
/**
 * Load custom keybindings from config file
 */
function loadCustomKeybindings(agentDir, keybindingsManager) {
    const configPath = (0, node_path_1.join)(agentDir, "keybindings.json");
    if (!(0, node_fs_1.existsSync)(configPath)) {
        return;
    }
    try {
        const content = (0, node_fs_1.readFileSync)(configPath, "utf-8");
        const custom = JSON.parse(content);
        for (const [key, value] of Object.entries(custom)) {
            keybindingsManager.setCustom(key, value);
        }
    }
    catch (error) {
        console.warn(`Failed to load keybindings from ${configPath}:`, error);
    }
}
//# sourceMappingURL=keybindings.js.map