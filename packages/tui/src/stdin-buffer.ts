/**
 * Stdin Buffer
 * 
 * Buffers stdin data and splits into individual sequences.
 * Helps handle batched input (e.g., from paste) correctly.
 */

import { EventEmitter } from 'node:events';

export interface StdinBufferEventMap {
	data: [sequence: string];
	paste: [content: string];
}

export interface StdinBufferOptions {
	/** Timeout in ms to wait before processing buffered data (default: 10) */
	timeout?: number;
	/** Threshold for paste detection (chars) - if buffer length exceeds this, emit 'paste' (default: 1024) */
	pasteThreshold?: number;
}

const DEFAULT_Options: StdinBufferOptions = {
	timeout: 10,
	pasteThreshold: 1024,
};

/**
 * StdinBuffer - processes raw stdin data and emits individual sequences.
 * 
 * Usage:
 *   const buffer = new StdinBuffer({ timeout: 10 });
 *   buffer.on('data', (seq) => { ... });
 *   buffer.on('paste', (content) => { ... });
 *   buffer.start();
 */
export class StdinBuffer extends EventEmitter {
	private options: Required<StdinBufferOptions>;
	private buffer = '';
	private timeoutId: any = null;
	private started = false;

	constructor(options: StdinBufferOptions = {}) {
		super();
		this.options = { ...DEFAULT_Options, ...options } as Required<StdinBufferOptions>;
	}

	/**
	 * Start listening to stdin and buffering data.
	 */
	start(): void {
		if (this.started) return;
		this.started = true;
		process.stdin.on('data', this.onData);
	}

	/**
	 * Stop listening and cleanup.
	 */
	stop(): void {
		if (!this.started) return;
		process.stdin.removeListener('data', this.onData);
		this.started = false;
		this.clearBuffer();
	}

	/**
	 * Destroy the buffer, cleanup all resources.
	 */
	destroy(): void {
		this.stop();
		this.removeAllListeners();
	}

	/**
	 * Process incoming data.
	 */
	private onData = (data: Buffer | string): void => {
		const str = typeof data === 'string' ? data : data.toString('utf8');
		this.buffer += str;

		// If buffer is very large, treat as paste
		if (this.buffer.length > this.options.pasteThreshold) {
			this.emit('paste', this.buffer);
			this.buffer = '';
			this.clearTimeout();
			return;
		}

		// Reset timeout
		this.clearTimeout();
		this.timeoutId = setTimeout(() => {
			this.processBuffer();
		}, this.options.timeout);
	};

	/**
	 * Process the current buffer, emitting individual sequences.
	 */
	private processBuffer(): void {
		if (this.buffer.length === 0) return;

		const sequences = this.splitIntoSequences(this.buffer);
		this.buffer = ''; // Clear buffer after splitting

		for (const seq of sequences) {
			// Check if it's a paste (too long?) - but we already checked threshold
			// Emit each sequence
			this.emit('data', seq);
		}
	}

	/**
	 * Split buffer into individual key sequences.
	 * Handles common escape sequences: CSI, SS3, OSC, etc.
	 */
	private splitIntoSequences(buffer: string): string[] {
		const sequences: string[] = [];
		let i = 0;

		while (i < buffer.length) {
			const char = buffer[i];

			// Escape sequence
			if (char === '\x1b') {
				const remaining = buffer.slice(i);
				const seqLength = this.parseEscapeSequenceLength(remaining);
				if (seqLength > 0) {
					sequences.push(buffer.slice(i, i + seqLength));
					i += seqLength;
				} else {
					// Incomplete escape sequence - keep in buffer for later
					// But since we already cleared buffer, we'll just emit what we have
					// and assume the rest will come later (though we already cleared)
					// This is simplified; for robustness, we shouldn't clear buffer until complete.
					// However, our processBuffer is called after timeout, assuming buffer is complete.
					// So we'll just take the rest as a sequence.
					sequences.push(remaining);
					break;
				}
				continue;
			}

			// Mouse event (X10 protocol) - special handling
			if (i + 5 < buffer.length && char === '\x1b' && buffer[i+1] === '[' && buffer[i+2] === 'M') {
				// Mouse sequence is 6 characters: ESC [ M <button> <x> <y>
				if (i + 5 < buffer.length) {
					sequences.push(buffer.slice(i, i + 6));
					i += 6;
					continue;
				}
			}

			// Normal character (including multi-byte UTF-8)
			// For simplicity, we'll treat each character as a sequence.
			// But we can group normal characters? Not needed; they'll be emitted individually.
			// However, for pasted text, we might want to group. We already have paste detection.
			// Emit single character
			sequences.push(char);
			i++;
		}

		return sequences;
	}

	/**
	 * Try to parse an escape sequence from the start of the string.
	 * Returns the length of the sequence if recognized, 0 otherwise.
	 */
	private parseEscapeSequenceLength(str: string): number {
		if (str.length === 0 || str[0] !== '\x1b') return 0;

		if (str.length < 2) return 0; // Need at least ESC + something

		const second = str[1];

		// CSI sequence: ESC [
		if (second === '[') {
			// Find the final byte (0x40 - 0x7e)
			for (let i = 2; i < str.length; i++) {
				const code = str.charCodeAt(i);
				if (code >= 0x40 && code <= 0x7e) {
					return i + 1; // Include the final byte
				}
			}
			// Incomplete CSI sequence
			return 0;
		}

		// SS3 sequence: ESC O
		if (second === 'O') {
			// Usually followed by one character (F1-F4, arrow keys in some modes)
			if (str.length >= 3) {
				return 3; // ESC O <char>
			}
			return 0; // Incomplete
		}

		// OSC sequence: ESC ]
		if (second === ']') {
			// OSC ends with BEL (0x07) or ESC \ (ST)
			for (let i = 2; i < str.length; i++) {
				if (str[i] === '\x07') {
					return i + 1; // Include BEL
				}
				// Check for ESC \ (ST)
				if (str[i] === '\x1b' && i + 1 < str.length && str[i+1] === '\\') {
					return i + 2;
				}
			}
			return 0; // Incomplete
		}

		// APC sequence: ESC _
		if (second === '_') {
			// APC ends with BEL or ESC \
			for (let i = 2; i < str.length; i++) {
				if (str[i] === '\x07') {
					return i + 1;
				}
				if (str[i] === '\x1b' && i + 1 < str.length && str[i+1] === '\\') {
					return i + 2;
				}
			}
			return 0;
		}

		// Two-character escape: ESC <char> (e.g., ESC \\, ESC ], etc.)
		// Most are two characters.
		return 2; // Assume ESC + one character
	}

	/**
	 * Clear the buffer and timeout.
	 */
	private clearBuffer(): void {
		this.buffer = '';
	}

	private clearTimeout(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}
}
