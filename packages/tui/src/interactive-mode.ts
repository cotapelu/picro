/**
 * Interactive Mode - Application Controller
 *
 * This module provides the InteractiveMode class which orchestrates the TUI
 * for the coding agent application. It sets up the layout, handles agent events,
 * and manages dialogs and selectors.
 */

import { TerminalUI } from './components/tui.js';
import type { UIElement, RenderContext, InteractiveElement, KeyEvent } from './components/base.js';
import { ElementContainer } from './components/base.js';
import { Input, type InputOptions } from './components/input.js';
import { Footer, type FooterItem } from './components/footer.js';
import { SelectList, type SelectItem } from './components/select-list.js';
import { UserMessage, type UserMessageOptions } from './components/user-message.js';
import { AssistantMessage, type AssistantMessageOptions } from './components/assistant-message.js';
import { ToolMessage, type ToolMessageOptions } from './components/tool-message.js';
import { Toast, type ToastOptions } from './components/toast.js';
import { CountdownTimer } from './components/countdown-timer.js';
import type { ExtensionUIContext, ExtensionWidgetOptions, ExtensionUIDialogOptions } from './extensions/extension-ui-context.js';

/**
 * Options for InteractiveMode
 */
export interface InteractiveModeOptions {
	/** Terminal UI instance */
	tui: TerminalUI;
	/** Optional placeholder text for the input */
	inputPlaceholder?: string;
	/** Optional initial status for footer */
	initialStatus?: string;
	/** Called when user submits input */
	onUserInput?: (text: string) => void;
}

/**
 * Internal chat message entry
 */
interface ChatMessage {
	id: string;
	element: UIElement;
}

/**
 * ChatInterface - Main layout container
 *
 * Composes:
 * - Message area (scrollable, showing chat messages)
 * - Input area (single-line)
 * - Footer (status line)
 */
class ChatInterface implements UIElement, InteractiveElement {
	public isFocused = false;
	private messages: ChatMessage[] = [];
	private messageContainer = new ElementContainer();
	private input: Input;
	private footer: Footer;
	private placeholder: string;
	private onUserInput?: (text: string) => void;
	private tui: TerminalUI;

	constructor(tui: TerminalUI, placeholder: string, onUserInput?: (text: string) => void) {
		this.tui = tui;
		this.placeholder = placeholder;
		this.onUserInput = onUserInput;
		this.input = new Input({
			placeholder,
			onSubmit: (value) => {
				if (value.trim()) {
					onUserInput?.(value);
				}
				this.input.setValue('');
				this.tui.requestRender();
			},
			onCancel: () => {
				this.input.setValue('');
				this.tui.requestRender();
			},
		});
		this.footer = new Footer({ leftItems: [], rightItems: [] });
	}

	/**
	 * Add a message to the chat
	 */
	addMessage(element: UIElement, id?: string): string {
		const msgId = id || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		this.messages.push({ id: msgId, element });
		this.tui.requestRender();
		return msgId;
	}

	/**
	 * Remove a message by ID
	 */
	removeMessage(id: string): void {
		const idx = this.messages.findIndex(m => m.id === id);
		if (idx !== -1) {
			this.messages.splice(idx, 1);
			this.tui.requestRender();
		}
	}

	/**
	 * Set status text in the footer (left items)
	 */
	setStatus(text: string): void {
		this.footer.leftItems = text ? [{ label: text }] : [];
		this.footer.clearCache?.();
		this.tui.requestRender();
	}

	/**
	 * Set footer right items
	 */
	setRightItems(items: FooterItem[]): void {
		this.footer.rightItems = items;
		this.footer.clearCache?.();
		this.tui.requestRender();
	}

	/**
	 * Focus the input field
	 */
	focusInput(): void {
		this.tui.setFocus(this.input);
		this.isFocused = true;
	}

	draw(context: RenderContext): string[] {
		const width = context.width;
		const totalHeight = context.height;

		// Allocate heights: footer (1), input (1), messages (remaining)
		const footerHeight = 1;
		const inputHeight = 1;
		const messagesHeight = Math.max(0, totalHeight - footerHeight - inputHeight);

		const lines: string[] = [];

		// 1. Render message area
		if (messagesHeight > 0) {
			// Combine all message lines
			const allMsgLines: string[] = [];
			for (const msg of this.messages) {
				// Render each message with large height to allow full output
				const msgLines = msg.element.draw({ width, height: 1e6 } as RenderContext);
				allMsgLines.push(...msgLines);
			}
			// If total lines exceed available, take the tail (scroll to bottom)
			if (allMsgLines.length > messagesHeight) {
				const start = allMsgLines.length - messagesHeight;
				lines.push(...allMsgLines.slice(start));
			} else {
				// Pad top with empty lines to align bottom
				const pad = messagesHeight - allMsgLines.length;
				for (let i = 0; i < pad; i++) {
					lines.push('');
				}
				lines.push(...allMsgLines);
			}
		}

		// 2. Render input (one line)
		const inputLines = this.input.draw({ width, height: inputHeight } as RenderContext);
		lines.push(...inputLines.slice(0, inputHeight));

		// 3. Render footer (one line)
		const footerLines = this.footer.draw({ width, height: footerHeight } as RenderContext);
		lines.push(...footerLines.slice(0, footerHeight));

		// Ensure total lines equals totalHeight (truncate from top if overflow)
		if (lines.length > totalHeight) {
			return lines.slice(lines.length - totalHeight);
		}
		return lines;
	}

	handleKey(key: KeyEvent): void {
		// Not used; focus is on child input
	}

	/** Get current editor text */
	getEditorText(): string {
		return this.input.getValue();
	}

	/** Set editor text */
	setEditorText(text: string): void {
		this.input.setValue(text);
	}

	/** Paste text into editor (at cursor) */
	pasteToEditor(text: string): void {
		// Input doesn't support paste at cursor directly; append at end
		const current = this.input.getValue();
		this.input.setValue(current + text);
	}

	clearCache(): void {
		this.input.clearCache?.();
		this.footer.clearCache?.();
		this.messages.forEach(m => m.element.clearCache?.());
	}
}

/**
 * InteractiveMode - Main application controller
 *
 * Manages:
 * - Layout (chat, input, footer)
 * - Agent session events
 * - Extension system integration
 * - Dialogs and selectors
 * - Status messages and footer updates
 */
export class InteractiveMode {
	private tui: TerminalUI;
	private chatInterface: ChatInterface;
	private countdownTimers: CountdownTimer[] = [];
	private extensionContext!: ExtensionUIContext;
	private userInputHandler?: (text: string) => void;

	constructor(options: InteractiveModeOptions) {
		this.tui = options.tui;
		this.userInputHandler = options.onUserInput;

		// Create the main chat interface
		this.chatInterface = new ChatInterface(
			this.tui,
			options.inputPlaceholder || 'You: ',
			(text) => {
				this.userInputHandler?.(text);
			}
		);

		// Set the chat interface as the root content of the TUI
		this.tui.append(this.chatInterface);

		// Initially focus the input
		this.chatInterface.focusInput();

		// Set initial footer status if provided
		if (options.initialStatus) {
			this.chatInterface.setStatus(options.initialStatus);
		}

		// Build the extension context
		this.extensionContext = this.createExtensionUIContext();
	}

	/**
	 * Add a user message to the chat
	 */
	addUserMessage(content: string, options?: Omit<UserMessageOptions, 'text'>): string {
		const msg = new UserMessage({ ...options, text: content });
		return this.chatInterface.addMessage(msg);
	}

	/**
	 * Add an assistant message to the chat
	 */
	addAssistantMessage(content: string, options?: Omit<AssistantMessageOptions, 'content'>): string {
		const msg = new AssistantMessage({ ...options, content });
		return this.chatInterface.addMessage(msg);
	}

	/**
	 * Add a tool message to the chat
	 */
	addToolMessage(toolName: string, output: string, exitCode?: number): string {
		const msg = new ToolMessage({ toolName, output, error: exitCode !== 0 });
		return this.chatInterface.addMessage(msg);
	}

	/**
	 * Set status text in the footer
	 */
	setStatus(message: string): void {
		this.chatInterface.setStatus(message);
	}

	/**
	 * Start a countdown timer
	 */
	startCountdown(
		id: string,
		timeoutMs: number,
		onTick: (seconds: number) => void,
		onComplete: () => void
	): void {
		const timer = new CountdownTimer(timeoutMs, this.tui, onTick, onComplete);
		this.countdownTimers.push(timer);
	}

	/**
	 * Show a modal dialog
	 */
	async showDialog(component: UIElement): Promise<void> {
		this.tui.showPanel(component, { anchor: 'center' });
	}

	/**
	 * Get the ExtensionUIContext for this session
	 */
	getExtensionUIContext(): ExtensionUIContext {
		return this.extensionContext;
	}

	/**
	 * Focus the input field
	 */
	focusInput(): void {
		this.chatInterface.focusInput();
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		for (const timer of this.countdownTimers) {
			timer.dispose();
		}
		this.countdownTimers = [];
		// Additional cleanup if needed
	}

	/**
	 * Build the ExtensionUIContext for this interactive mode
	 */
	private createExtensionUIContext(): ExtensionUIContext {
		const mode = this;
		return {
			select: async (title, options, opts) => {
				// Build a simple selector panel
				const container = new ElementContainer();
				const items: SelectItem[] = options.map((opt, idx) => ({
					value: String(idx),
					label: opt,
				}));
				const selectList = new SelectList(
					items,
					Math.min(options.length, 10),
					{},
					(value) => {
						const idx = parseInt(value, 10);
						resolve(options[idx]);
						handle.close();
					},
					() => {
						resolve(undefined);
						handle.close();
					}
				);
				container.append(selectList);
				let resolve: (value: string | undefined) => void = () => {};
				const handle = mode.tui.showPanel(container, { anchor: 'center' });
				return new Promise<string | undefined>((r) => {
					resolve = r;
				});
			},
			confirm: async (title, message, opts) => {
				// Simple confirm: show a modal with Yes/No using two buttons? For now return true
				// Could implement properly with a custom dialog.
				return true;
			},
			input: async (title, placeholder, opts) => {
				const container = new ElementContainer();
				const input = new Input({
					placeholder,
					onSubmit: (val) => {
						resolve(val);
						handle.close();
					},
					onCancel: () => {
						resolve(undefined);
						handle.close();
					},
				});
				container.append(input);
				let resolve: (value: string | undefined) => void = () => {};
				const handle = mode.tui.showPanel(container, { anchor: 'center' });
				return new Promise<string | undefined>((r) => {
					resolve = r;
				});
			},
			notify: (message, type) => {
				// Show a toast notification
				const duration = 4000;
				const toast = new Toast({ message, type: type as any, duration });
				const handle = mode.tui.showPanel(toast, { anchor: 'top-right' });
				// Auto-close after duration
				setTimeout(() => handle.close(), duration);
			},
			onTerminalInput: (handler) => {
				// Could add a keyhandler to TUI
			},
			setStatus: (key, text) => {
				// Use footer right items to show keyed status
				// For simplicity: if key is known, show; else ignore
				// We'll treat this as an additional right item
				// Implementation: maintain a map of statuses and update footer items.
				// For now, replace right items with single item (should change to merge)
				mode.chatInterface.setRightItems([{ key, label: text }]);
			},
			setWorkingMessage: (message) => {
				if (message) {
					mode.setStatus(`⏳ ${message}`);
				} else {
					mode.setStatus('');
				}
			},
			setWorkingIndicator: (opts) => {
				// Could show spinner in status
			},
			setHiddenThinkingLabel: (label) => {
				// No-op
			},
			setWidget: (key, content, options) => {
				// Not implemented: would need a widget area
				console.log(`setWidget ${key}`);
			},
			setFooter: (factory) => {
				// Replace footer component entirely - needs a way to swap in the layout
			},
			setHeader: (factory) => {
				// Not implemented
			},
			setTitle: (title) => {
				mode.tui.terminal.setTitle(title);
			},
			custom: async (factory, options) => {
				const component = factory(mode.tui);
				await mode.showDialog(component);
			},
			pasteToEditor: (text) => {
				mode.chatInterface.pasteToEditor?.(text);
			},
			setEditorText: (text) => {
				mode.chatInterface.setEditorText?.(text);
			},
			getEditorText: () => {
				return mode.chatInterface.getEditorText?.() ?? '';
			},
			editor: async (title, prefill) => {
				// Simple editor using Input (single-line)
				const container = new ElementContainer();
				const input = new Input({
					placeholder: title || 'Edit',
					value: prefill,
					onSubmit: (val) => {
						resolveInput(val);
						handle.close();
					},
					onCancel: () => {
						resolveInput(undefined);
						handle.close();
					},
				});
				container.append(input);
				let resolveInput: (value: string | undefined) => void = () => {};
				const handle = mode.tui.showPanel(container, { anchor: 'center' });
				return new Promise<string | undefined>((r) => { resolveInput = r; });
			},
			addAutocompleteProvider: (factory) => {
				console.warn('addAutocompleteProvider not implemented yet');
			},
			setEditorComponent: (factory) => {
				console.warn('setEditorComponent not implemented yet');
			},
			get theme() {
				// Minimal stub: return a plain object
				return { primary: '', secondary: '', accent: '', background: '', foreground: '' } as any;
			},
			getAllThemes: () => {
				return [];
			},
			getTheme: (name) => {
				return undefined;
			},
			setTheme: (themeOrName) => {
				return { success: false };
			},
			getToolsExpanded: () => {
				return true;
			},
			setToolsExpanded: (expanded) => {
				// No-op
			},
		};
	}
}
