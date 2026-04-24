/**
 * Keyboard Input Handling
 * 
 * Parses raw terminal input into structured key events.
 * Supports Kitty keyboard protocol and xterm modifyOtherKeys.
 */

/**
 * Special key names
 */
export enum Key {
	// Navigation
	Up = 'ArrowUp',
	Down = 'ArrowDown',
	Left = 'ArrowLeft',
	Right = 'ArrowRight',
	Home = 'Home',
	End = 'End',
	PageUp = 'PageUp',
	PageDown = 'PageDown',

	// Editing
	Enter = 'Enter',
	Escape = 'Escape',
	Tab = 'Tab',
	Backspace = 'Backspace',
	Delete = 'Delete',
	Insert = 'Insert',

	// Function keys
	F1 = 'F1',
	F2 = 'F2',
	F3 = 'F3',
	F4 = 'F4',
	F5 = 'F5',
	F6 = 'F6',
	F7 = 'F7',
	F8 = 'F8',
	F9 = 'F9',
	F10 = 'F10',
	F11 = 'F11',
	F12 = 'F12',

	// Modifiers
	Shift = 'Shift',
	Control = 'Control',
	Alt = 'Alt',
	Meta = 'Meta',
}

/**
 * Keyboard event types (Kitty protocol)
 */
export type KeyEventType = 'press' | 'repeat' | 'release';

/**
 * Key identifier for matching
 */
export interface KeyId {
	name: string;
	ctrl?: boolean;
	alt?: boolean;
	shift?: boolean;
	meta?: boolean;
}

/**
 * Parsed key event
 */
export interface ParsedKey {
	/** Raw input string */
	raw: string;
	/** Key name if recognized */
	name?: string;
	/** Modifier keys */
	ctrl?: boolean;
	alt?: boolean;
	shift?: boolean;
	meta?: boolean;
	/** Event type (Kitty protocol) */
	eventType?: KeyEventType;
	/** Whether this is a key release event */
	isRelease?: boolean;
	/** Whether this is a key repeat event */
	isRepeat?: boolean;
}

// State tracking
let kittyProtocolActive = false;
let modifyOtherKeysActive = false;

/**
 * Enable/disable Kitty keyboard protocol tracking
 */
export function setKittyProtocolActive(active: boolean): void {
	kittyProtocolActive = active;
}

/**
 * Check if Kitty keyboard protocol is active
 */
export function isKittyProtocolActive(): boolean {
	return kittyProtocolActive;
}

/**
 * Enable/disable xterm modifyOtherKeys
 */
export function setModifyOtherKeysActive(active: boolean): void {
	modifyOtherKeysActive = active;
}

/**
 * Parse a key event from raw terminal input
 * @param data Raw input string from terminal
 * @returns ParsedKey or null if not a key event
 */
export function parseKey(data: string): ParsedKey | null {
	if (!data || data.length === 0) return null;

	const result: ParsedKey = { raw: data };

	// Check for Kitty protocol: CSI ... u
	const kittyMatch = data.match(/^\x1b\[(\d+)(?:;(\d+))?u$/);
	if (kittyMatch) {
		return parseKittyKey(data, kittyMatch);
	}

	// Check for modifyOtherKeys: CSI 27 ; mods ; code ~
	const modOtherMatch = data.match(/^\x1b\[27;(\d+);(\d+)~$/);
	if (modOtherMatch) {
		return parseModifyOtherKeys(data, modOtherMatch);
	}

	// Check for CSI sequences (arrows, function keys, etc.)
	const csiMatch = data.match(/^\x1b\[(.+)$/);
	if (csiMatch) {
		return parseCsiSequence(data, csiMatch[1]);
	}

	// Check for SS3 sequences (cursor keys in keypad mode)
	const ss3Match = data.match(/^\x1bO(.)$/);
	if (ss3Match) {
		return parseSs3Sequence(data, ss3Match[1]);
	}

	// Check for Alt+key (ESC prefix)
	if (data.length > 1 && data[0] === '\x1b') {
		const afterEsc = data.slice(1);
		if (afterEsc.length === 1) {
			result.alt = true;
			result.name = afterEsc;
			return result;
		}
	}

	// Single character
	if (data.length === 1) {
		const char = data[0];
		const code = char.charCodeAt(0);

		// Control characters (Ctrl+letter)
		if (code < 32) {
			result.ctrl = true;
			// Convert to meaningful name
			if (code === 0x03) {
				result.name = 'C-c'; // Ctrl+C
			} else if (code === 0x0d) {
				result.name = Key.Enter;
			} else if (code === 0x1b) {
				result.name = Key.Escape;
			} else if (code === 0x7f || code === 0x08) {
				result.name = Key.Backspace;
			} else if (code === 0x09) {
				result.name = Key.Tab;
			} else {
				result.name = `C-${String.fromCharCode(code + 64).toLowerCase()}`;
			}
			return result;
		}

		// Printable characters
		result.name = char;
		return result;
	}

	return result;
}

/**
 * Parse Kitty keyboard protocol sequence
 * Format: CSI key_code ; modifiers ; event_type u
 */
function parseKittyKey(data: string, match: RegExpMatchArray): ParsedKey {
	const result: ParsedKey = { raw: data };
	const keyCode = parseInt(match[1], 10);
	const mods = match[2] ? parseInt(match[2], 10) : 0;
	const eventType = match[2] && match[2].length > 0 ? parseInt(match[2], 10) : undefined;

	// Parse modifiers (bit flags)
	result.shift = !!(mods & 1);
	result.alt = !!(mods & 2);
	result.ctrl = !!(mods & 4);
	result.meta = !!(mods & 8);

	// Parse event type
	if (eventType !== undefined) {
		if (eventType === 1) result.isRelease = true;
		else if (eventType === 2) result.isRepeat = true;
		result.eventType = result.isRelease ? 'release' : result.isRepeat ? 'repeat' : 'press';
	}

	// Map key code to name
	result.name = mapKittyKeyCode(keyCode);

	return result;
}

/**
 * Map Kitty key code to key name
 */
function mapKittyKeyCode(code: number): string {
	// Special keys
	if (code === 57358) return Key.Up;
	if (code === 57359) return Key.Down;
	if (code === 57356) return Key.Left;
	if (code === 57357) return Key.Right;
	if (code === 57360) return Key.Home;
	if (code === 57361) return Key.End;
	if (code === 57362) return Key.PageUp;
	if (code === 57363) return Key.PageDown;
	if (code === 57365) return Key.Insert;
	if (code === 57366) return Key.Delete;

	// Function keys
	if (code >= 57376 && code <= 57387) {
		return `F${code - 57376 + 1}`;
	}

	// Enter, Escape, Tab, Backspace
	if (code === 13) return Key.Enter;
	if (code === 27) return Key.Escape;
	if (code === 9) return Key.Tab;
	if (code === 8 || code === 127) return Key.Backspace;

	// Printable characters
	if (code >= 32 && code <= 126) {
		return String.fromCharCode(code);
	}

	return `key${code}`;
}

/**
 * Parse xterm modifyOtherKeys sequence
 * Format: CSI 27 ; mods ; code ~
 */
function parseModifyOtherKeys(data: string, match: RegExpMatchArray): ParsedKey {
	const result: ParsedKey = { raw: data };
	const mods = parseInt(match[1], 10);
	const code = parseInt(match[2], 10);

	// Parse modifiers
	result.shift = !!(mods & 1);
	result.alt = !!(mods & 2);
	result.ctrl = !!(mods & 4);
	result.meta = !!(mods & 8);

	// Map code
	if (code === 13) result.name = Key.Enter;
	else if (code === 9) result.name = Key.Tab;
	else if (code === 127) result.name = Key.Backspace;
	else if (code >= 32 && code <= 126) result.name = String.fromCharCode(code);

	return result;
}

/**
 * Parse CSI sequence
 */
function parseCsiSequence(data: string, seq: string): ParsedKey {
	const result: ParsedKey = { raw: data };

	// CSI [1;modsA for Up with modifiers, etc.
	const modMatch = seq.match(/^(\d+)?;(\d+)?(.)$/);
	if (modMatch) {
		const baseCode = modMatch[1] ? parseInt(modMatch[1], 10) : 1;
		const mods = modMatch[2] ? parseInt(modMatch[2], 10) : 0;
		const finalChar = modMatch[3];

		// Parse modifiers
		if (mods > 0) {
			result.shift = !!(mods & 1);
			result.alt = !!(mods & 2);
			result.ctrl = !!(mods & 4);
			result.meta = !!(mods & 8);
		}

		// Map based on final character
		if (finalChar === 'A') result.name = Key.Up;
		else if (finalChar === 'B') result.name = Key.Down;
		else if (finalChar === 'C') result.name = Key.Right;
		else if (finalChar === 'D') result.name = Key.Left;
		else if (finalChar === 'H') result.name = Key.Home;
		else if (finalChar === 'F') result.name = Key.End;
		else if (finalChar === '~') {
			// Function keys, etc.
			if (baseCode === 1 || baseCode === 7) result.name = Key.Home;
			else if (baseCode === 2 || baseCode === 8) result.name = Key.Insert;
			else if (baseCode === 3) result.name = Key.Delete;
			else if (baseCode === 4 || baseCode === 5) result.name = Key.End;
			else if (baseCode === 5 || baseCode === 6) result.name = Key.PageUp; // Actually 5=PageUp, 6=PageDown
			else if (baseCode === 6) result.name = Key.PageDown;
			else if (baseCode >= 11 && baseCode <= 15) result.name = `F${baseCode - 10}`;
			else if (baseCode >= 17 && baseCode <= 21) result.name = `F${baseCode - 16}`;
			else if (baseCode >= 23 && baseCode <= 24) result.name = `F${baseCode - 22}`;
		}

		return result;
	}

	// Simple CSI sequences without modifiers
	if (seq === 'A') result.name = Key.Up;
	else if (seq === 'B') result.name = Key.Down;
	else if (seq === 'C') result.name = Key.Right;
	else if (seq === 'D') result.name = Key.Left;
	else if (seq === 'H') result.name = Key.Home;
	else if (seq === 'F') result.name = Key.End;
	else if (seq === '~') result.name = Key.Delete;
	else if (seq === '2~') result.name = Key.Insert;
	else if (seq === '3~') result.name = Key.Delete;
	else if (seq === '5~') result.name = Key.PageUp;
	else if (seq === '6~') result.name = Key.PageDown;
	else if (seq.startsWith('1')) result.name = Key.Home;
	else if (seq.startsWith('4')) result.name = Key.End;

	return result;
}

/**
 * Parse SS3 sequence (ESC O followed by char)
 */
function parseSs3Sequence(data: string, char: string): ParsedKey {
	const result: ParsedKey = { raw: data };

	if (char === 'A') result.name = Key.Up;
	else if (char === 'B') result.name = Key.Down;
	else if (char === 'C') result.name = Key.Right;
	else if (char === 'D') result.name = Key.Left;
	else if (char === 'F') result.name = Key.End;
	else if (char === 'H') result.name = Key.Home;
	else if (char === 'P') result.name = Key.F1;
	else if (char === 'Q') result.name = Key.F2;
	else if (char === 'R') result.name = Key.F3;
	else if (char === 'S') result.name = Key.F4;

	return result;
}

/**
 * Check if a key event is a release event
 */
export function isKeyRelease(key: ParsedKey | string): boolean {
	if (typeof key === 'string') {
		const parsed = parseKey(key);
		return parsed?.isRelease ?? false;
	}
	return key.isRelease ?? false;
}

/**
 * Check if a key event is a repeat event
 */
export function isKeyRepeat(key: ParsedKey | string): boolean {
	if (typeof key === 'string') {
		const parsed = parseKey(key);
		return parsed?.isRepeat ?? false;
	}
	return key.isRepeat ?? false;
}

/**
 * Match a key event against a key identifier
 * @param key Key event (string or ParsedKey)
 * @param keyId Key identifier to match against
 * @returns true if key matches
 */
export function matchesKey(key: string | ParsedKey, keyId: string | KeyId): boolean {
	const parsed = typeof key === 'string' ? parseKey(key) : key;
	if (!parsed || !parsed.name) return false;

	const target = typeof keyId === 'string' ? parseKeyId(keyId) : keyId;
	if (!target) return false;

	// Check name (case insensitive for letters)
	const nameMatches = parsed.name.toLowerCase() === target.name.toLowerCase();
	if (!nameMatches) return false;

	// Check modifiers (only check if target specifies them)
	if (target.ctrl !== undefined && parsed.ctrl !== target.ctrl) return false;
	if (target.alt !== undefined && parsed.alt !== target.alt) return false;
	if (target.shift !== undefined && parsed.shift !== target.shift) return false;
	if (target.meta !== undefined && parsed.meta !== target.meta) return false;

	return true;
}

/**
 * Parse a key identifier string like "ctrl+shift+enter"
 */
function parseKeyId(id: string): KeyId | null {
	const parts = id.toLowerCase().split('+');
	const result: KeyId = { name: '' };

	for (const part of parts) {
		if (part === 'ctrl' || part === 'control') result.ctrl = true;
		else if (part === 'alt') result.alt = true;
		else if (part === 'shift') result.shift = true;
		else if (part === 'meta' || part === 'cmd') result.meta = true;
		else result.name = part;
	}

	if (!result.name) return null;
	return result;
}

/**
 * Encode a key event for Kitty protocol
 * @param key Key name
 * @param modifiers Modifier flags
 * @returns CSI sequence for Kitty protocol
 */
export function encodeKittyKey(key: string, modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } = {}): string {
	let keyCode = 0;

	// Map key name to Kitty key code
	if (key === Key.Up) keyCode = 57358;
	else if (key === Key.Down) keyCode = 57359;
	else if (key === Key.Left) keyCode = 57356;
	else if (key === Key.Right) keyCode = 57357;
	else if (key === Key.Home) keyCode = 57360;
	else if (key === Key.End) keyCode = 57361;
	else if (key === Key.PageUp) keyCode = 57362;
	else if (key === Key.PageDown) keyCode = 57363;
	else if (key === Key.Insert) keyCode = 57365;
	else if (key === Key.Delete) keyCode = 57366;
	else if (key.startsWith('F')) {
		const fNum = parseInt(key.slice(1), 10);
		if (fNum >= 1 && fNum <= 12) keyCode = 57376 + fNum - 1;
	}
	else if (key.length === 1) {
		keyCode = key.toUpperCase().charCodeAt(0);
	}

	if (keyCode === 0) return '';

	// Build modifier flags
	let mods = 0;
	if (modifiers.shift) mods |= 1;
	if (modifiers.alt) mods |= 2;
	if (modifiers.ctrl) mods |= 4;
	if (modifiers.meta) mods |= 8;

	return `\x1b[${keyCode};${mods}u`;
}

/**
 * Decode Kitty printable representation
 * Used for debugging/display
 */
export function decodeKittyPrintable(data: string): string {
	return data;
}
