/**
 * Terminal Interface
 * 
 * Minimal terminal interface for TUI
 * Follows legacy style from pi-tui-legacy
 */

import { StdinBuffer } from './stdin-buffer';
import { setKittyProtocolActive } from './keys';

export interface Terminal {
	start(onInput: (data: string) => void, onResize: () => void): void;
	stop(): void;
	drainInput(maxMs?: number, idleMs?: number): Promise<void>;
	write(data: string): void;
	get columns(): number;
	get rows(): number;
	get kittyProtocolActive(): boolean;
	moveBy(lines: number): void;
	moveTo(row: number, col: number): void;
	hideCursor(): void;
	showCursor(): void;
	clearLine(): void;
	clearFromCursor(): void;
	clearScreen(): void;
	setTitle(title: string): void;
	queryCellSize(): Promise<{ width: number; height: number }>;
	writeImage(sequence: string): void;
}

/**
 * Real terminal using process.stdin/stdout
 * Follows legacy style from pi-tui-legacy
 */
export class ProcessTerminal implements Terminal {
	private wasRaw = false;
	private inputHandler?: (data: string) => void;
	private resizeHandler?: () => void;
	private _kittyProtocolActive = false;
	private _modifyOtherKeysActive = false;
	private stdinBuffer?: StdinBuffer;
	private stdinDataHandler?: (data: string) => void;
	private stopped = false;

	get kittyProtocolActive(): boolean {
		return this._kittyProtocolActive;
	}

	start(onInput: (data: string) => void, onResize: () => void): void {
		this.inputHandler = onInput;
		this.resizeHandler = onResize;

		// Save previous state and enable raw mode
		this.wasRaw = process.stdin.isRaw || false;
		if (process.stdin.setRawMode) {
			process.stdin.setRawMode(true);
		}
		process.stdin.setEncoding('utf8');
		process.stdin.resume();

		// Enable bracketed paste mode
		process.stdout.write('\x1b[?2004h');

		// Set up resize handler immediately
		process.stdout.on('resize', this.resizeHandler);

		// Refresh terminal dimensions
		if (process.platform !== 'win32') {
			process.kill(process.pid, 'SIGWINCH');
		}

		// Enable Windows VT input
		this.enableWindowsVTInput();

		// Setup StdinBuffer to split batched input
		this.setupStdinBuffer();

		// Query and enable Kitty keyboard protocol
		this.queryAndEnableKittyProtocol();
	}

	/**
	 * Set up StdinBuffer to split batched input into individual sequences.
	 * Follows legacy style - feed data through process() method.
	 */
	private setupStdinBuffer(): void {
		this.stdinBuffer = new StdinBuffer({ timeout: 10 });

		// Forward individual sequences to the input handler
		this.stdinBuffer.on('data', (sequence: string) => {
			// Check for Kitty protocol response (only if not already enabled)
			if (!this._kittyProtocolActive) {
				const match = sequence.match(/^\x1b\[\?(\d+)u$/);
				if (match) {
					this._kittyProtocolActive = true;
					setKittyProtocolActive(true);

					// Enable Kitty keyboard protocol (push flags)
					// Flag 1 = disambiguate escape codes
					// Flag 2 = report event types (press/repeat/release)
					// Flag 4 = report alternate keys
					process.stdout.write('\x1b[>7u');
					return;
				}
			}

			if (this.inputHandler) {
				this.inputHandler(sequence);
			}
		});

		// Handle paste content
		this.stdinBuffer.on('paste', (content: string) => {
			if (this.inputHandler) {
				this.inputHandler(`\x1b[200~${content}\x1b[201~`);
			}
		});

		// Handler that pipes stdin data through the buffer
		this.stdinDataHandler = (data: string) => {
			this.stdinBuffer?.process(data);
		};
	}

	/**
	 * Query terminal for Kitty keyboard protocol support and enable if available.
	 */
	private queryAndEnableKittyProtocol(): void {
		process.stdin.on('data', this.stdinDataHandler!);
		process.stdout.write('\x1b[?u');
		setTimeout(() => {
			if (!this._kittyProtocolActive && !this._modifyOtherKeysActive) {
				process.stdout.write('\x1b[>4;2m');
				this._modifyOtherKeysActive = true;
			}
		}, 150);
	}

	/**
	 * On Windows, add ENABLE_VIRTUAL_TERMINAL_INPUT
	 */
	private enableWindowsVTInput(): void {
		if (process.platform !== 'win32') return;
		try {
			const cjsRequire = require('module').createRequire(__filename);
			const koffi = cjsRequire('koffi');
			const k32 = koffi.load('kernel32.dll');

			const GetStdHandle = k32.func('void* __stdcall GetStdHandle(int)');
			const GetConsoleMode = k32.func('bool __stdcall GetConsoleMode(void*, _Out_ uint32_t*)');
			const SetConsoleMode = k32.func('bool __stdcall SetConsoleMode(void*, uint32_t)');

			const STD_INPUT_HANDLE = -10;
			const ENABLE_VIRTUAL_TERMINAL_INPUT = 0x0200;

			const handle = GetStdHandle(STD_INPUT_HANDLE);
			const mode = new Uint32Array(1);
			GetConsoleMode(handle, mode);
			SetConsoleMode(handle, mode[0]! | ENABLE_VIRTUAL_TERMINAL_INPUT);
		} catch {
			// koffi not available
		}
	}

	async drainInput(maxMs = 1000, idleMs = 50): Promise<void> {
		// Disable Kitty keyboard protocol first
		if (this._kittyProtocolActive) {
			process.stdout.write('\x1b[<u');
			this._kittyProtocolActive = false;
			setKittyProtocolActive(false);
		}
		if (this._modifyOtherKeysActive) {
			process.stdout.write('\x1b[>4;0m');
			this._modifyOtherKeysActive = false;
		}

		const previousHandler = this.inputHandler;
		this.inputHandler = undefined;

		let lastDataTime = Date.now();
		const onData = () => {
			lastDataTime = Date.now();
		};

		process.stdin.on('data', onData);
		const endTime = Date.now() + maxMs;

		try {
			while (true) {
				const now = Date.now();
				const timeLeft = endTime - now;
				if (timeLeft <= 0) break;
				if (now - lastDataTime >= idleMs) break;
				await new Promise((resolve) => setTimeout(resolve, Math.min(idleMs, timeLeft)));
			}
		} finally {
			process.stdin.removeListener('data', onData);
			this.inputHandler = previousHandler;
		}
	}

	stop(): void {
		this.stopped = true;

		// Disable bracketed paste mode
		process.stdout.write('\x1b[?2004l');

		// Disable Kitty keyboard protocol
		if (this._kittyProtocolActive) {
			process.stdout.write('\x1b[<u');
			this._kittyProtocolActive = false;
			setKittyProtocolActive(false);
		}
		if (this._modifyOtherKeysActive) {
			process.stdout.write('\x1b[>4;0m');
			this._modifyOtherKeysActive = false;
		}

		// Clean up StdinBuffer
		if (this.stdinBuffer) {
			this.stdinBuffer.destroy();
			this.stdinBuffer = undefined;
		}

		// Remove stdin data handler
		if (this.stdinDataHandler) {
			process.stdin.removeListener('data', this.stdinDataHandler);
			this.stdinDataHandler = undefined;
		}

		this.inputHandler = undefined;
		if (this.resizeHandler) {
			process.stdout.removeListener('resize', this.resizeHandler);
			this.resizeHandler = undefined;
		}

		// Pause stdin to prevent buffered input being re-interpreted
		process.stdin.pause();

		// Restore raw mode state
		if (process.stdin.setRawMode) {
			process.stdin.setRawMode(this.wasRaw);
		}
	}

	write(data: string): void {
		process.stdout.write(data);
	}

	get columns(): number {
		return process.stdout.columns || 80;
	}

	get rows(): number {
		return process.stdout.rows || 24;
	}

	moveBy(lines: number): void {
		if (lines > 0) {
			process.stdout.write(`\x1b[${lines}B`);
		} else if (lines < 0) {
			process.stdout.write(`\x1b[${-lines}A`);
		}
	}

	moveTo(row: number, col: number): void {
		// ANSI escape sequence: move cursor to row, col (1-indexed)
		process.stdout.write(`\x1b[${row};${col}H`);
	}

	hideCursor(): void {
		process.stdout.write('\x1b[?25l');
	}

	showCursor(): void {
		process.stdout.write('\x1b[?25h');
	}

	clearLine(): void {
		process.stdout.write('\x1b[K');
	}

	clearFromCursor(): void {
		process.stdout.write('\x1b[J');
	}

	clearScreen(): void {
		process.stdout.write('\x1b[2J\x1b[H');
	}

	setTitle(title: string): void {
		process.stdout.write(`\x1b]0;${title}\x07`);
	}

	/**
	 * Query terminal cell size in pixels
	 * Uses CSI 16 t to query cell size
	 */
	async queryCellSize(): Promise<{ width: number; height: number }> {
		return new Promise((resolve) => {
			// Default fallback values
			const fallback = { width: 9, height: 18 };

			// Send CSI 16 t to query cell size
			process.stdout.write('\x1b[16t');

			// Set up a one-time listener to capture response
			const timeout = setTimeout(() => {
				resolve(fallback);
			}, 500);

			const onResponse = (data: string) => {
				// Response format: \x1b[6;row;colR
				const match = data.match(/^\x1b\[6;(\d+);(\d+)t$/);
				if (match) {
					clearTimeout(timeout);
					process.stdin.removeListener('data', onResponse);
					// Note: CSI 16 t actually returns character cell dimensions
					// Format: \x1b[6;rows;colsR where rows/cols are in pixels
					// But many terminals don't support this, so we use defaults
					resolve(fallback);
				}
			};

			process.stdin.on('data', onResponse);
		});
	}

	/**
	 * Write terminal image escape sequence
	 * For Kitty, iTerm2, and other image-capable terminals
	 */
	writeImage(sequence: string): void {
		process.stdout.write(sequence);
	}
}