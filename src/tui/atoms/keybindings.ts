/**
 * Keybindings Manager
 * 
 * Manages configurable keyboard shortcuts with context support.
 * Allows users to customize key bindings for different UI contexts.
 */

import { parseKey, type ParsedKey, matchesKey, type KeyId } from './keys';

/**
 * A single keybinding definition
 */
export interface Keybinding {
	/** Unique identifier for this binding (e.g., "tui.select.up") */
	id: string;
	/** Human-readable description */
	description?: string;
	/** Default key combination(s) - can be multiple */
	defaultKeys: string[];
	/** Current active key(s) - can be customized */
	keys: string[];
	/** Context where this binding applies (e.g., "select-list", "editor") */
	context?: string;
	/** Whether this binding is enabled */
	enabled: boolean;
}

/**
 * Keybinding definitions grouped by context
 */
export interface KeybindingDefinitions {
	[context: string]: Keybinding[];
}

/**
 * User configuration for keybindings
 */
export interface KeybindingsConfig {
	/** Custom key overrides: { "binding-id": "new-key" } */
	overrides?: Record<string, string | string[]>;
	/** Disabled bindings */
	disabled?: string[];
}

/**
 * Conflict information for a keybinding
 */
export interface KeybindingConflict {
	bindingId: string;
	conflictingWith: string;
	key: string;
}

/**
 * KeybindingsManager - manages all keybindings
 */
export class KeybindingsManager {
	private definitions: Map<string, Keybinding> = new Map();
	private config: KeybindingsConfig;
	private contextStack: string[] = [];

	constructor(definitions?: KeybindingDefinitions, config?: KeybindingsConfig) {
		this.config = config || {};
		if (definitions) {
			this.registerDefinitions(definitions);
		}
	}

	/**
	 * Register keybinding definitions
	 */
	registerDefinitions(defs: KeybindingDefinitions): void {
		for (const [context, bindings] of Object.entries(defs)) {
			for (const binding of bindings) {
				const id = binding.id;
				const existing = this.definitions.get(id);
				if (existing) {
					// Merge - keep user overrides if any
					const keys = this.config.overrides?.[id] || binding.defaultKeys;
					existing.keys = Array.isArray(keys) ? keys : [keys];
					existing.enabled = !this.config.disabled?.includes(id);
				} else {
					const keys = this.config.overrides?.[id] || binding.defaultKeys;
					this.definitions.set(id, {
						...binding,
						keys: Array.isArray(keys) ? keys : [keys],
						context: binding.context || context,
						enabled: !this.config.disabled?.includes(id),
					});
				}
			}
		}
	}

	/**
	 * Push a context onto the stack (for hierarchical contexts)
	 */
	pushContext(context: string): void {
		this.contextStack.push(context);
	}

	/**
	 * Pop the current context
	 */
	popContext(): string | undefined {
		return this.contextStack.pop();
	}

	/**
	 * Set the current context (replaces entire stack)
	 */
	setContext(context: string): void {
		this.contextStack = [context];
	}

	/**
	 * Get current context
	 */
	getCurrentContext(): string | undefined {
		return this.contextStack[this.contextStack.length - 1];
	}

	/**
	 * Check if a key event matches a binding ID
	 * @param data Raw key data or ParsedKey
	 * @param bindingId The binding ID to match against
	 * @returns true if the key matches
	 */
	matches(data: string | ParsedKey, bindingId: string): boolean {
		const binding = this.definitions.get(bindingId);
		if (!binding || !binding.enabled) return false;

		// Check context
		if (binding.context) {
			const currentContext = this.getCurrentContext();
			if (binding.context !== currentContext) return false;
		}

		// Parse the key if needed
		const parsed = typeof data === 'string' ? parseKey(data) : data;
		if (!parsed) return false;

		// Check against all keys for this binding
		for (const keyStr of binding.keys) {
			if (matchesKey(parsed, keyStr)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Find binding ID that matches the given key
	 * @param data Raw key data
	 * @param context Optional context filter
	 * @returns binding ID or null
	 */
	findMatch(data: string, context?: string): string | null {
		const parsed = parseKey(data);
		if (!parsed) return null;

		for (const [id, binding] of this.definitions) {
			if (!binding.enabled) continue;
			if (context && binding.context !== context) continue;

			for (const keyStr of binding.keys) {
				if (matchesKey(parsed, keyStr)) {
					return id;
				}
			}
		}

		return null;
	}

	/**
	 * Get all bindings for a context
	 */
	getBindingsForContext(context: string): Keybinding[] {
		const result: Keybinding[] = [];
		for (const binding of this.definitions.values()) {
			if (binding.context === context) {
				result.push(binding);
			}
		}
		return result;
	}

	/**
	 * Get all bindings
	 */
	getAllBindings(): Keybinding[] {
		return Array.from(this.definitions.values());
	}

	/**
	 * Get a specific binding
	 */
	getBinding(id: string): Keybinding | undefined {
		return this.definitions.get(id);
	}

	/**
	 * Update a binding's keys
	 */
	setBinding(id: string, keys: string | string[]): void {
		const binding = this.definitions.get(id);
		if (binding) {
			binding.keys = Array.isArray(keys) ? keys : [keys];
		}
	}

	/**
	 * Enable/disable a binding
	 */
	setEnabled(id: string, enabled: boolean): void {
		const binding = this.definitions.get(id);
		if (binding) {
			binding.enabled = enabled;
		}
	}

	/**
	 * Check for conflicts in current bindings
	 * @returns Array of conflict information
	 */
	findConflicts(): KeybindingConflict[] {
		const conflicts: KeybindingConflict[] = [];
		const bindings = this.getAllBindings();

		for (let i = 0; i < bindings.length; i++) {
			for (let j = i + 1; j < bindings.length; j++) {
				const a = bindings[i];
				const b = bindings[j];

				// Skip if different contexts
				if (a.context !== b.context) continue;
				// Skip if either is disabled
				if (!a.enabled || !b.enabled) continue;

				// Check for key overlaps
				for (const keyA of a.keys) {
					for (const keyB of b.keys) {
						if (keyA.toLowerCase() === keyB.toLowerCase()) {
							conflicts.push({
								bindingId: a.id,
								conflictingWith: b.id,
								key: keyA,
							});
						}
					}
				}
			}
		}

		return conflicts;
	}

	/**
	 * Load user configuration
	 */
	loadConfig(config: KeybindingsConfig): void {
		this.config = config;

		// Apply overrides
		if (config.overrides) {
			for (const [id, keys] of Object.entries(config.overrides)) {
				this.setBinding(id, keys);
			}
		}

		// Apply disabled
		if (config.disabled) {
			for (const id of config.disabled) {
				this.setEnabled(id, false);
			}
		}
	}

	/**
	 * Export current configuration (for saving to user config file)
	 */
	exportConfig(): KeybindingsConfig {
		const overrides: Record<string, string | string[]> = {};
		const disabled: string[] = [];

		for (const [id, binding] of this.definitions) {
			// Check if keys differ from default
			const keysMatch = binding.keys.length === binding.defaultKeys.length &&
				binding.keys.every((k, i) => k === binding.defaultKeys[i]);
			if (!keysMatch) {
				overrides[id] = binding.keys.length === 1 ? binding.keys[0] : binding.keys;
			}

			if (!binding.enabled) {
				disabled.push(id);
			}
		}

		return { overrides, disabled };
	}
}

/**
 * Default TUI keybindings
 */
export const TUI_KEYBINDINGS: KeybindingDefinitions = {
	'tui.select': [
		{
			id: 'tui.select.up',
			description: 'Move selection up',
			defaultKeys: ['up', 'k'],
			keys: ['up', 'k'],
			enabled: true,
		},
		{
			id: 'tui.select.down',
			description: 'Move selection down',
			defaultKeys: ['down', 'j'],
			keys: ['down', 'j'],
			enabled: true,
		},
		{
			id: 'tui.select.confirm',
			description: 'Confirm selection',
			defaultKeys: ['enter', ' '],
			keys: ['enter', ' '],
			enabled: true,
		},
		{
			id: 'tui.select.cancel',
			description: 'Cancel selection',
			defaultKeys: ['escape', 'ctrl+c'],
			keys: ['escape', 'ctrl+c'],
			enabled: true,
		},
		{
			id: 'tui.select.pageup',
			description: 'Page up',
			defaultKeys: ['pageup'],
			keys: ['pageup'],
			enabled: true,
		},
		{
			id: 'tui.select.pagedown',
			description: 'Page down',
			defaultKeys: ['pagedown'],
			keys: ['pagedown'],
			enabled: true,
		},
	],
	'tui.editor': [
		{
			id: 'tui.editor.up',
			description: 'Move cursor up',
			defaultKeys: ['up'],
			keys: ['up'],
			enabled: true,
		},
		{
			id: 'tui.editor.down',
			description: 'Move cursor down',
			defaultKeys: ['down'],
			keys: ['down'],
			enabled: true,
		},
		{
			id: 'tui.editor.left',
			description: 'Move cursor left',
			defaultKeys: ['left'],
			keys: ['left'],
			enabled: true,
		},
		{
			id: 'tui.editor.right',
			description: 'Move cursor right',
			defaultKeys: ['right'],
			keys: ['right'],
			enabled: true,
		},
		{
			id: 'tui.editor.newline',
			description: 'Insert newline',
			defaultKeys: ['enter'],
			keys: ['enter'],
			enabled: true,
		},
		{
			id: 'tui.editor.backspace',
			description: 'Delete character before cursor',
			defaultKeys: ['backspace'],
			keys: ['backspace'],
			enabled: true,
		},
		{
			id: 'tui.editor.delete',
			description: 'Delete character after cursor',
			defaultKeys: ['delete'],
			keys: ['delete'],
			enabled: true,
		},
	],
};

// Global keybindings manager instance
let globalManager: KeybindingsManager | null = null;

/**
 * Get the global keybindings manager
 */
export function getKeybindings(): KeybindingsManager {
	if (!globalManager) {
		globalManager = new KeybindingsManager(TUI_KEYBINDINGS);
	}
	return globalManager;
}

/**
 * Set the global keybindings manager
 */
export function setKeybindings(manager: KeybindingsManager): void {
	globalManager = manager;
}
