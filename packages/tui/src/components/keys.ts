/**
 * Keyboard handling for TUI
 */

/** Key event type - internal, not exported */
export type KeyEventType = 'press' | 'repeat' | 'release';

/** Unique key identifier */
export interface KeyId {
	seq: string;
	name?: string;
	release?: boolean;
}

/** Parsed representation of a key event */
export interface ParsedKey {
	raw: string;
	type: KeyEventType;
	name: string;
	ctrl: boolean;
	alt: boolean;
	shift: boolean;
	meta: boolean;
}

// Constants for Kitty protocol (internal)
export const KITTY_PROTOCOL_ACTIVE = Symbol('kitty-active');

/**
 * Enable/disable Kitty keyboard protocol
 */
export function setKittyProtocolActive(active: boolean): void {
	(KITTY_PROTOCOL_ACTIVE as any).active = active;
}

/**
 * Check if Kitty keyboard protocol is active
 */
export function isKittyProtocolActive(): boolean {
	return (KITTY_PROTOCOL_ACTIVE as any).active === true;
}

/**
 * Check if a key event is a key repeat
 */
export function isKeyRepeat(key: ParsedKey | string): boolean {
	if (typeof key === 'string') return false;
	return key.type === 'repeat';
}

/**
 * Decode Kitty printable protocol (for bracketed paste)
 */
export function decodeKittyPrintable(data: string): string {
	return data.replace(/\x1b_pi;/, '').replace(/\x1b\\/g, '');
}

/**
 * Parse raw key data into structured format
 * Supports common keys: Enter, Escape, Backspace, Tab, Arrows, PageUp, PageDown
 */
export function parseKey(data: string): ParsedKey | null {
	// Handle special single-character keys
	if (data === '\r' || data === '\n') {
		return { raw: data, type: 'press', name: 'enter', ctrl: false, alt: false, shift: false, meta: false };
	}
	if (data === '\t') {
		return { raw: data, type: 'press', name: 'tab', ctrl: false, alt: false, shift: false, meta: false };
	}
	if (data === '\x7f' || data === '\x08') {
		return { raw: data, type: 'press', name: 'backspace', ctrl: false, alt: false, shift: false, meta: false };
	}
	if (data === '\x1b') {
		return { raw: data, type: 'press', name: 'escape', ctrl: false, alt: false, shift: false, meta: false };
	}

	// Handle CSI sequences (ESC [ ...)
	if (data.length >= 3 && data[0] === '\x1b' && data[1] === '[') {
		const finalChar = data[data.length - 1];
		const inner = data.substring(2, data.length - 1); // between '[' and final char

		// Arrow keys: ESC [ A/B/C/D
		if (finalChar === 'A') {
			return { raw: data, type: 'press', name: 'up', ctrl: false, alt: false, shift: false, meta: false };
		}
		if (finalChar === 'B') {
			return { raw: data, type: 'press', name: 'down', ctrl: false, alt: false, shift: false, meta: false };
		}
		if (finalChar === 'C') {
			return { raw: data, type: 'press', name: 'right', ctrl: false, alt: false, shift: false, meta: false };
		}
		if (finalChar === 'D') {
			return { raw: data, type: 'press', name: 'left', ctrl: false, alt: false, shift: false, meta: false };
		}
		// PageUp/PageDown: ESC [ 5 ~ / ESC [ 6 ~
		if (finalChar === '~') {
			const num = parseInt(inner, 10);
			if (num === 5) {
				return { raw: data, type: 'press', name: 'pageup', ctrl: false, alt: false, shift: false, meta: false };
			}
			if (num === 6) {
				return { raw: data, type: 'press', name: 'pagedown', ctrl: false, alt: false, shift: false, meta: false };
			}
		}
	}

	// Single printable character: name is the character itself
	if (data.length === 1) {
		return { raw: data, type: 'press', name: data, ctrl: false, alt: false, shift: false, meta: false };
	}

	return null;
}

/**
 * Check if a key event is a key release
 */
export function isKeyRelease(key: ParsedKey | string): boolean {
	if (typeof key === 'string') return false;
	return key.type === 'release';
}

/**
 * Check if a key matches a keybinding pattern
 */
export function matchesKey(key: string | ParsedKey, keyId: string | KeyId): boolean {
	const seq = typeof keyId === 'string' ? keyId : keyId.seq;
	if (typeof key === 'string') {
		return key === seq;
	}
	return key.raw === seq || key.name === seq;
}

// Dummy Key export - value not used but kept for compatibility
export const Key = {};
