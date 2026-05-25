/**
 * Keybindings Manager - Manage keybindings for the application
 */
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
/** Default app keybindings */
export declare const KEYBINDINGS: AppKeybindings;
/**
 * Keybindings manager class
 */
export declare class KeybindingsManager {
    private bindings;
    private custom;
    constructor(defaultBindings?: AppKeybindings);
    /** Get a keybinding */
    get(name: string): Keybinding | undefined;
    /** Set a custom keybinding */
    setCustom(name: string, binding: Keybinding): void;
    /** Clear custom keybinding */
    clearCustom(name: string): void;
    /** Get all keybindings */
    getAll(): Map<string, Keybinding>;
}
/**
 * Create a keybindings manager
 */
export declare function createKeybindingsManager(): KeybindingsManager;
/**
 * Load custom keybindings from config file
 */
export declare function loadCustomKeybindings(agentDir: string, keybindingsManager: KeybindingsManager): void;
//# sourceMappingURL=keybindings.d.ts.map