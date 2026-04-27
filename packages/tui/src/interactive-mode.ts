/**
 * Interactive Mode - Application Controller
 *
 * This module provides the InteractiveMode class which orchestrates the TUI
 * for the coding agent application. It sets up the layout, handles agent events,
 * and manages dialogs/selectors.
 *
 * This is a minimal initial implementation that will be expanded.
 */

import { TerminalUI } from './components/tui.js';
import type { UIElement } from './components/base.js';
import { CountdownTimer } from './components/countdown-timer.js';

/**
 * Options for InteractiveMode
 */
export interface InteractiveModeOptions {
	/** Initial terminal */
	tui: TerminalUI;
	// future options...
}

/**
 * InteractiveMode - Main application controller
 *
 * Manages:
 * - Layout (header, chat, editor, footer, widgets)
 * - Agent session events
 * - Extension system integration
 * - Dialogs and selectors
 * - Status messages and footer updates
 */
export class InteractiveMode {
	private tui: TerminalUI;
	private countdownTimers: CountdownTimer[] = [];

	constructor(options: InteractiveModeOptions) {
		this.tui = options.tui;
		// initialize components...
	}

	/**
	 * Show a modal selector with the given options
	 */
	async showSelector<T extends UIElement>(
		component: T,
		options?: { timeout?: number }
	): Promise<T | null> {
		// Stub: replace editor with component and wait for selection
		console.log('showSelector stub');
		return component;
	}

	/**
	 * Show a modal dialog
	 */
	async showDialog(component: UIElement): Promise<void> {
		// Stub
		console.log('showDialog stub');
	}

	/**
	 * Set a temporary status message in the footer
	 */
	setStatus(message: string, durationMs?: number): void {
		// Stub
		console.log('setStatus:', message);
	}

	/**
	 * Start a countdown timer that triggers an action after timeout
	 */
	startCountdown(timeoutMs: number, onTick: (seconds: number) => void, onComplete: () => void): void {
		const timer = new CountdownTimer(timeoutMs, this.tui, onTick, onComplete);
		this.countdownTimers.push(timer);
	}

	/**
	 * Dispos
	 */
	dispose(): void {
		for (const timer of this.countdownTimers) {
			timer.dispose();
		}
		this.countdownTimers = [];
	}
}
