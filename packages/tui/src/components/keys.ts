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
 */
export function parseKey(data: string): ParsedKey | null {
	if (data === '\r' || data === '\n') {
		return { raw: data, type: 'press', name: 'Enter', ctrl: false, alt: false, shift: false, meta: false };
	}
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
