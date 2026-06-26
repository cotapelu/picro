// Example: Building a simple interactive TUI app with the new libraries
import { Screen } from '../../tui/Screen';
import {
  StateManager,
  createInitialState,
  renderHeader,
  renderFooter,
  renderMessageList,
  renderInput,
  renderToast,
  renderModal,
  createToast,
  createInputState,
  updateInputValue,
  addToHistory,
  moveInputHistoryUp,
  moveInputHistoryDown,
} from '../components';

/**
 * Minimal interactive app skeleton
 * This demonstrates how to use the TUI core + Interactive Components
 */
export class BasicInteractiveApp {
  private screen: Screen;
  private state: StateManager;
  private width: number;
  private height: number;

  constructor() {
    // Initialize state
    this.state = new StateManager(createInitialState());

    // Create screen
    this.screen = new Screen({
      title: 'picro - demo',
      input: true,
    });

    // Get terminal size
    const size = this.screen.getSize();
    this.width = size.width;
    this.height = size.height;

    // Setup handlers
    this.setupInput();
    this.setupResize();
    this.setupRender();
  }

  private setupInput(): void {
    this.screen.onInput((key) => {
      const input = this.state.getProperty('input');

      switch (key) {
        case '\r': // Enter
          this.handleSubmit();
          break;
        case '\u0003': // Ctrl+C
          this.screen.stop();
          process.exit(0);
          break;
        case '\x1b[A': // Arrow up
          this.state.update('input', moveInputHistoryUp);
          break;
        case '\x1b[B': // Arrow down
          this.state.update('input', moveInputHistoryDown);
          break;
        case '\u007f': // Backspace
        case '\b':   // Backspace (Ctrl+H)
          const newValue = input.value.slice(0, -1);
          this.state.update('input', updateInputValue(newValue));
          break;
        default:
          // Printable character
          if (key.length === 1 && key >= ' ' && key <= '~') {
            const newValue = input.value + key;
            this.state.update('input', updateInputValue(newValue));
          }
      }
    });
  }

  private setupResize(): void {
    this.screen.onResize(() => {
      const size = this.screen.getSize();
      this.width = size.width;
      this.height = size.height;
      this.render();
    });
  }

  private setupRender(): void {
    // Subscribe to state changes - re-render on any relevant change
    this.state.subscribeAll(() => this.render());
  }

  private handleSubmit(): void {
    const input = this.state.getProperty('input');
    const text = input.value.trim();

    if (!text) return;

    // Add user message
    this.state.update('messages', (prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      },
    ]);

    // Add to history
    this.state.update('input', (state) => addToHistory(state, text));

    // Simulate processing
    this.state.update('isProcessing', true);

    // Simulate response after delay
    setTimeout(() => {
      this.state.update('isProcessing', false);
      this.state.update('messages', (prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Echo: ${text}\n\n(Interactive mode demo - replace with actual LLM call)`,
          timestamp: Date.now(),
        },
      ]);
      this.addToast('Response received', 'success');
    }, 1000);
  }

  private addToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    this.state.update('toasts', (prev) => [
      ...prev,
      createToast(message, type, 3000),
    ]);
  }

  private render(): void {
    const state = this.state.get();

    // Build output
    const lines: string[] = [];

    // Header
    lines.push(renderHeader(state, { width: this.width }));

    // Messages
    const availableHeight = this.height - 4; // header + input + footer + buffer
    const maxMessages = Math.max(5, availableHeight - 5);
    const messagesOutput = renderMessageList(state.messages, {
      width: this.width,
      maxMessages,
    });
    if (messagesOutput) {
      lines.push(messagesOutput);
    } else {
      lines.push('\n[No messages yet. Type a message to start.]\n');
    }

    // Input
    lines.push(renderInput(state.input, '> ', this.width));

    // Footer
    lines.push(renderFooter(state, { width: this.width }));

    // Toasts (overlay at top)
    if (state.toasts.length > 0) {
      const toastLines = state.toasts
        .map((t, i) => renderToast(t, i, this.width))
        .join('\n');
      // Insert toasts at top (after header)
      lines.splice(1, 0, toastLines);
    }

    // Modal overlay
    if (state.modal.type !== 'none') {
      const modalOutput = renderModal(state.modal);
      // Center modal
      const modalLines = modalOutput.split('\n');
      const verticalPadding = Math.max(0, Math.floor((this.height - modalLines.length) / 2));
      for (let i = 0; i < verticalPadding; i++) {
        lines.push('');
      }
      lines.push(...modalLines);
    }

    // Clear and write
    this.screen.clear();
    this.screen.stdout.write(lines.join('\n'));
  }

  async start(): Promise<void> {
    console.log('Starting interactive demo...');
    this.screen.start();
  }
}

// Run if executed directly
if (require.main === module) {
  const app = new BasicInteractiveApp();
  app.start().catch(console.error);
}
