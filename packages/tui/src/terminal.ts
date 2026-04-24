/**
 * Terminal Interface
 * 
 * Minimal terminal interface for TUI
 */

import { StdinBuffer } from './stdin-buffer.js';

export interface Terminal {
	// Start the terminal with input and resize handlers
	start(onInput: (data: string) => void, onResize: () => void): void;

	// Stop the terminal and restore state
	stop(): void;

	// Drain stdin before exiting
	drainInput(maxMs?: number, idleMs?: number): Promise<void>;

	// Write output to terminal
	write(data: string): void;

	// Get terminal dimensions
	get columns(): number;
	get rows(): number;

	// Whether Kitty keyboard protocol is active
	get kittyProtocolActive(): boolean;

	// Cursor positioning (relative to current position)
	moveBy(lines: number): void;

	// Cursor visibility
	hideCursor(): void;
	showCursor(): void;

	// Clear operations
	clearLine(): void;
	clearFromCursor(): void;
	clearScreen(): void;

	// Title operations
	setTitle(title: string): void;
}

/**
 * Real terminal using process.stdin/stdout
 */
export class ProcessTerminal implements Terminal {
	private wasRaw = false;
	private inputHandler?: (data: string) => void;
	private resizeHandler?: () => void;
	private _kittyProtocolActive = false;
	private _modifyOtherKeysActive = false;
	private stopped = false;
	private stdinBuffer?: StdinBuffer;

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

		// Set up resize handler
		process.stdout.on('resize', this.resizeHandler);

		// Refresh terminal dimensions
		if (process.platform !== 'win32') {
			process.kill(process.pid, 'SIGWINCH');
		}

		// Enable Windows VT input
		this.enableWindowsVTInput();

		// Create StdinBuffer for better input handling
		this.stdinBuffer = new StdinBuffer({ timeout: 10 });
		this.stdinBuffer.on('paste', (content: string) => {
			if (this.inputHandler) {
				// Wrap pasted content with bracketed paste markers
				this.inputHandler('\x1b[200~' + content + '\x1b[201~');
			}
		});
		// Normal data forwarding
		this.stdinBuffer.on('data', (seq: string) => {
			if (this.inputHandler) this.inputHandler(seq);
		});
		this.stdinBuffer.start();

		// Query and enable Kitty keyboard protocol
		this.queryAndEnableKittyProtocol();

		// Global SIGINT handler for Ctrl+C
		process.once('SIGINT', () => this.handleSigint());
	}

	/**
	 * Query terminal for Kitty keyboard protocol support
	 */
	private queryAndEnableKittyProtocol(): void {
		// Send query
		process.stdout.write('\x1b[?u');

		let responseReceived = false;

		const responseHandler = (data: string) => {
			// Check for Kitty protocol response: \x1b[?<flags>u
			const match = data.match(/^\x1b\[\?(\d+)u$/);
			if (match && !responseReceived) {
				this._kittyProtocolActive = true;
				responseReceived = true;

				// Enable Kitty keyboard protocol
				process.stdout.write('\x1b[>7u');

				// Remove temporary listener from stdinBuffer
				if (this.stdinBuffer) {
					this.stdinBuffer.removeListener('data', responseHandler);
				}
				return;
			}

			// Forward to normal input handler
			if (this.inputHandler) {
				this.inputHandler(data);
			}
		};

		// Install temporary handler on stdinBuffer
		if (this.stdinBuffer) {
			this.stdinBuffer.on('data', responseHandler);
		}

		// After timeout, remove temporary listener and enable modifyOtherKeys if needed
		setTimeout(() => {
			if (this.stdinBuffer) {
				this.stdinBuffer.removeListener('data', responseHandler);
			}
			if (!this._kittyProtocolActive && !this._modifyOtherKeysActive) {
				process.stdout.write('\x1b[>4;2m');
				this._modifyOtherKeysActive = true;
			}
		}, 150);
	}

	/**
	 * Enable Windows VT input
	 */
	private enableWindowsVTInput(): void {
		if (process.platform !== 'win32') return;

		try {
			// Dynamic require for koffi
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
		// Disable Kitty keyboard protocol
		if (this._kittyProtocolActive) {
			process.stdout.write('\x1b[<u');
			this._kittyProtocolActive = false;
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
		// Disable bracketed paste mode
		process.stdout.write('\x1b[?2004l');

		// Disable Kitty keyboard protocol
		if (this._kittyProtocolActive) {
			process.stdout.write('\x1b[<u');
			this._kittyProtocolActive = false;
		}
		if (this._modifyOtherKeysActive) {
			process.stdout.write('\x1b[>4;0m');
			this._modifyOtherKeysActive = false;
		}

		// Remove event handlers
		if (this.resizeHandler) {
			process.stdout.removeListener('resize', this.resizeHandler);
			this.resizeHandler = undefined;
		}

		// Pause stdin
		process.stdin.pause();

		// Restore raw mode state
		if (process.stdin.setRawMode) {
			process.stdin.setRawMode(this.wasRaw);
		}
	}

	private handleSigint(): void {
		try {
			console.error('SIGINT received, stopping...');
			if (!this.stopped) this.stop();
			setTimeout(() => process.exit(0), 100);
		} catch (e) {
			process.exit(1);
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
}
