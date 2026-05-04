/**
 * StdinBuffer
 * 
 * Buffers stdin data and splits into individual sequences.
 * Helps handle batched input (e.g., from paste) correctly.
 * 
 * Legacy style: use process() method to feed data, rather than
 * auto-attaching to stdin which can cause conflicts.
 */

import { EventEmitter } from 'node:events';

export const ESC = "\x1b";
export const BRACKETED_PASTE_START = "\x1b[200~";
export const BRACKETED_PASTE_END = "\x1b[201~";

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

export const DEFAULT_OPTIONS: StdinBufferOptions = {
	timeout: 10,
	pasteThreshold: 1024,
};

/**
 * Check if a string is a complete escape sequence or needs more data
 */
export function isCompleteSequence(data: string): 'complete' | 'incomplete' | 'not-escape' {
	if (!data.startsWith(ESC)) {
		return 'not-escape';
	}

	if (data.length === 1) {
		return 'incomplete';
	}

	const afterEsc = data.slice(1);

	// CSI sequences: ESC [
	if (afterEsc.startsWith('[')) {
		// Check for old-style mouse sequence: ESC[M + 3 bytes = 6 total
		if (afterEsc.startsWith('[M')) {
			return data.length >= 6 ? 'complete' : 'incomplete';
		}
		return isCompleteCsiSequence(data);
	}

	// OSC sequences: ESC ]
	if (afterEsc.startsWith(']')) {
		return isCompleteOscSequence(data);
	}

	// DCS sequences: ESC P ... ESC \
	if (afterEsc.startsWith('P')) {
		return isCompleteDcsSequence(data);
	}

	// APC sequences: ESC _ ... ESC \
	if (afterEsc.startsWith('_')) {
		return isCompleteApcSequence(data);
	}

	// SS3 sequences: ESC O
	if (afterEsc.startsWith('O')) {
		return afterEsc.length >= 2 ? 'complete' : 'incomplete';
	}

	// Meta key: ESC + single char
	if (afterEsc.length === 1) {
		return 'complete';
	}

	return 'complete';
}

export function isCompleteCsiSequence(data: string): 'complete' | 'incomplete' {
	if (!data.startsWith(`${ESC}[`)) {
		return 'complete';
	}

	if (data.length < 3) {
		return 'incomplete';
	}

	const payload = data.slice(2);
	const lastChar = payload[payload.length - 1];
	const lastCharCode = lastChar.charCodeAt(0);

	if (lastCharCode >= 0x40 && lastCharCode <= 0x7e) {
		// Special handling for SGR mouse sequences
		if (payload.startsWith('<')) {
			const mouseMatch = /^<\d+;\d+;\d+[Mm]$/.test(payload);
			if (mouseMatch) {
				return 'complete';
			}
			if (lastChar === 'M' || lastChar === 'm') {
				const parts = payload.slice(1, -1).split(';');
				if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
					return 'complete';
				}
			}
			return 'incomplete';
		}
		return 'complete';
	}

	return 'incomplete';
}

export function isCompleteOscSequence(data: string): 'complete' | 'incomplete' {
	if (!data.startsWith(`${ESC}]`)) {
		return 'complete';
	}

	if (data.endsWith(`${ESC}\\`) || data.endsWith('\x07')) {
		return 'complete';
	}

	return 'incomplete';
}

export function isCompleteDcsSequence(data: string): 'complete' | 'incomplete' {
	if (!data.startsWith(`${ESC}P`)) {
		return 'complete';
	}

	if (data.endsWith(`${ESC}\\`)) {
		return 'complete';
	}

	return 'incomplete';
}

export function isCompleteApcSequence(data: string): 'complete' | 'incomplete' {
	if (!data.startsWith(`${ESC}_`)) {
		return 'complete';
	}

	if (data.endsWith(`${ESC}\\`)) {
		return 'complete';
	}

	return 'incomplete';
}

/**
 * Split accumulated buffer into complete sequences
 */
export function extractCompleteSequences(buffer: string): { sequences: string[]; remainder: string } {
	const sequences: string[] = [];
	let pos = 0;

	while (pos < buffer.length) {
		const remaining = buffer.slice(pos);

		if (remaining.startsWith(ESC)) {
			let seqEnd = 1;
			while (seqEnd <= remaining.length) {
				const candidate = remaining.slice(0, seqEnd);
				const status = isCompleteSequence(candidate);

				if (status === 'complete') {
					sequences.push(candidate);
					pos += seqEnd;
					break;
				} else if (status === 'incomplete') {
					seqEnd++;
				} else {
					sequences.push(candidate);
					pos += seqEnd;
					break;
				}
			}

			if (seqEnd > remaining.length) {
				return { sequences, remainder: remaining };
			}
		} else {
			sequences.push(remaining[0]!);
			pos++;
		}
	}

	return { sequences, remainder: '' };
}

/**
 * StdinBuffer - processes raw stdin data and emits individual sequences.
 * 
 * Usage (legacy style):
 *   const buffer = new StdinBuffer();
 *   buffer.on('data', (seq) => { ... });
 *   process.stdin.on('data', (data) => buffer.process(data));
 */
export class StdinBuffer extends EventEmitter<StdinBufferEventMap> {
	private buffer = '';
	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private readonly options: Required<StdinBufferOptions>;
	private pasteMode = false;
	private pasteBuffer = '';

	constructor(options: StdinBufferOptions = {}) {
		super();
		this.options = { ...DEFAULT_OPTIONS, ...options } as Required<StdinBufferOptions>;
	}

	/**
	 * Feed input data to the buffer.
	 * Called by terminal with process.stdin.on('data').
	 */
	public process(data: string | Buffer): void {
		// Clear any pending timeout
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		// Handle high-byte conversion
		let str: string;
		if (Buffer.isBuffer(data)) {
			if (data.length === 1 && data[0]! > 127) {
				const byte = data[0]! - 128;
				str = `\x1b${String.fromCharCode(byte)}`;
			} else {
				str = data.toString('utf8');
			}
		} else {
			str = data;
		}

		if (str.length === 0 && this.buffer.length === 0) {
			this.emit('data', '');
			return;
		}

		this.buffer += str;

		// Handle bracketed paste
		if (this.pasteMode) {
			this.handlePasteData();
			return;
		}

		const startIndex = this.buffer.indexOf(BRACKETED_PASTE_START);
		if (startIndex !== -1) {
			this.handlePasteStart(startIndex);
			return;
		}

		// Process normal buffer
		const result = extractCompleteSequences(this.buffer);
		this.buffer = result.remainder;

		for (const sequence of result.sequences) {
			this.emit('data', sequence);
		}

		if (this.buffer.length > 0) {
			this.timeoutId = setTimeout(() => {
				const flushed = this.flush();
				for (const sequence of flushed) {
					this.emit('data', sequence);
				}
			}, this.options.timeout);
		}
	}

	private handlePasteStart(startIndex: number): void {
		if (startIndex > 0) {
			const beforePaste = this.buffer.slice(0, startIndex);
			const result = extractCompleteSequences(beforePaste);
			for (const sequence of result.sequences) {
				this.emit('data', sequence);
			}
		}

		this.buffer = this.buffer.slice(startIndex + BRACKETED_PASTE_START.length);
		this.pasteMode = true;
		this.pasteBuffer = this.buffer;
		this.buffer = '';

		const endIndex = this.pasteBuffer.indexOf(BRACKETED_PASTE_END);
		if (endIndex !== -1) {
			const pastedContent = this.pasteBuffer.slice(0, endIndex);
			const remaining = this.pasteBuffer.slice(endIndex + BRACKETED_PASTE_END.length);

			this.pasteMode = false;
			this.pasteBuffer = '';

			this.emit('paste', pastedContent);

			if (remaining.length > 0) {
				this.process(remaining);
			}
		}
	}

	private handlePasteData(): void {
		this.pasteBuffer += this.buffer;
		this.buffer = '';

		const endIndex = this.pasteBuffer.indexOf(BRACKETED_PASTE_END);
		if (endIndex !== -1) {
			const pastedContent = this.pasteBuffer.slice(0, endIndex);
			const remaining = this.pasteBuffer.slice(endIndex + BRACKETED_PASTE_END.length);

			this.pasteMode = false;
			this.pasteBuffer = '';

			this.emit('paste', pastedContent);

			if (remaining.length > 0) {
				this.process(remaining);
			}
		}
	}

	/**
	 * Flush any buffered data
	 */
	flush(): string[] {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		if (this.buffer.length === 0) {
			return [];
		}

		const sequences = [this.buffer];
		this.buffer = '';
		return sequences;
	}

	/**
	 * Clear the buffer
	 */
	clear(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		this.buffer = '';
		this.pasteMode = false;
		this.pasteBuffer = '';
	}

	/**
	 * Get current buffer content
	 */
	getBuffer(): string {
		return this.buffer;
	}

	/**
	 * Destroy and cleanup
	 */
	destroy(): void {
		this.clear();
		this.removeAllListeners();
	}
}