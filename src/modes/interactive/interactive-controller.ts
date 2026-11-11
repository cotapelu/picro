// InteractiveController - Thuần TypeScript, không dùng React/Ink
// Nắm giữ AgentSessionRuntime, xử lý slash commands, cung cấp API đơn giản cho UI.

import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
}

export interface RuntimeStatus {
  model: string;
  tokens: string;
  cwd: string;
  isProcessing: boolean;
  contextPercent?: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
  createdAt: number;
}

export interface ModalState {
  type: 'none' | 'login' | 'help' | 'thinking' | 'confirmation' |
        'session-selector' | 'model-selector' | 'settings' | 'custom' | 'theme-selector';
  props?: Record<string, any>;
}

export interface InteractiveControllerOptions {
  runtime: AgentSessionRuntimeInterface;
}

export class InteractiveController {
  private runtime: AgentSessionRuntimeInterface;
  private messages: ChatMessage[] = [];
  private status: RuntimeStatus;
  private modal: ModalState = { type: 'none' };
  private toasts: ToastItem[] = [];

  private onMessageCallback: ((messages: ChatMessage[]) => void) | null = null;
  private onStatusChangeCallback: ((status: RuntimeStatus) => void) | null = null;
  private onToastCallback: ((toast: ToastItem) => void) | null = null;
  private onModalCallback: ((modal: ModalState) => void) | null = null;

  constructor(options: InteractiveControllerOptions) {
    this.runtime = options.runtime;
    this.status = {
      model: 'unknown',
      tokens: '0/0',
      cwd: this.runtime.cwd || '.',
      isProcessing: false,
    };

    this.subscribeToRuntime();
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  private subscribeToRuntime(): void {
    const session = this.runtime.session as any;
    if (!session?.subscribe) return;

    const unsub = session.subscribe((event: any) => {
      switch (event.type) {
        case 'agent_start':
          this.setIsProcessing(true);
          break;
        case 'agent_end':
          this.setIsProcessing(false);
          break;
        case 'message_start':
          this.setIsProcessing(true);
          break;
        case 'message_end': {
          this.setIsProcessing(false);
          const content = event.message?.content || '';
          const text = Array.isArray(content)
            ? content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
            : String(content);
          this.addAssistantMessage(text);
          break;
        }
        case 'error': {
          this.setIsProcessing(false);
          this.addToast(event.message || 'Error', 'error');
          break;
        }
      }
    });
    // Store unsubscribe if needed later
    (this as any)._unsub = unsub;
  }

  private setIsProcessing(processing: boolean): void {
    this.status.isProcessing = processing;
    this.onStatusChangeCallback?.(this.status);
  }

  // ============================================================================
  // Public API for UI
  // ============================================================================

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getStatus(): RuntimeStatus {
    return { ...this.status };
  }

  getModal(): ModalState {
    return { ...this.modal };
  }

  getToasts(): ToastItem[] {
    return [...this.toasts];
  }

  onMessage(callback: (messages: ChatMessage[]) => void): void {
    this.onMessageCallback = callback;
    callback(this.messages);
  }

  onStatusChange(callback: (status: RuntimeStatus) => void): void {
    this.onStatusChangeCallback = callback;
    callback(this.status);
  }

  onToast(callback: (toast: ToastItem) => void): void {
    this.onToastCallback = callback;
  }

  onModalChange(callback: (modal: ModalState) => void): void {
    this.onModalCallback = callback;
    callback(this.modal);
  }

  // ============================================================================
  // User actions
  // ============================================================================

  async sendMessage(text: string): Promise<void> {
    if (!text.trim()) return;

    this.addUserMessage(text);

    try {
      await this.runtime.prompt(text);
    } catch (err: any) {
      this.addToast(err.message || 'Unknown error', 'error');
    }
  }

  async runCommand(commandId: string, args?: string): Promise<void> {
    switch (commandId) {
      case 'quit':
      case 'exit':
        process.exit(0);
        return;

      case 'thinking': {
        const valid = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
        if (args && valid.includes(args)) {
          await this.runtime.setThinkingLevel(args as any);
          this.addToast(`Thinking level set to ${args}`, 'success');
        } else {
          this.setModal({ type: 'thinking', props: { current: this.status.model, options: valid } });
        }
        return;
      }

      case 'login':
        this.setModal({ type: 'login' });
        return;

      case 'help':
        this.setModal({ type: 'help' });
        return;

      case 'copy': {
        if (args === 'all') {
          const conversation = this.messages.map((m) => {
            const role = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'Tool';
            return `${role}: ${m.content}`;
          }).join('\n\n');
          await this.runtime.copyToClipboard(conversation);
          this.addToast('Copied full conversation to clipboard', 'success');
        } else {
          const last = [...this.messages].reverse().find((m) => m.role === 'assistant');
          if (last) {
            await this.runtime.copyToClipboard(last.content);
            this.addToast('Copied last assistant message', 'success');
          } else {
            this.addToast('No assistant message to copy', 'info');
          }
        }
        return;
      }

      case 'resume':
        this.setModal({ type: 'session-selector' });
        return;

      case 'new': {
        const result = await this.runtime.newSession();
        if (result.cancelled) {
          this.addToast('New session cancelled', 'info');
        } else {
          this.messages = [];
          this.onMessageCallback?.(this.messages);
          this.addToast('New session created', 'success');
        }
        return;
      }

      case 'settings': {
        const settings = this.runtime.settings as any;
        this.setModal({
          type: 'settings',
          props: {
            theme: settings.getTheme?.() || 'default',
            disabledTools: settings.getDisabledTools?.() || [],
            defaultProvider: settings.getDefaultProvider?.() || 'none',
            defaultModel: settings.getDefaultModel?.() || 'none',
            defaultThinkingLevel: settings.getDefaultThinkingLevel?.() || 'off',
          },
        });
        return;
      }

      case 'model': {
        const modelRegistry = this.runtime.services?.modelRegistry || {};
        const providers = modelRegistry.getProviders?.() || [];
        const models: Array<{ id: string; provider: string }> = [];
        for (const p of providers) {
          const pm = modelRegistry.getModels?.(p) || [];
          for (const m of pm) {
            models.push({ id: m.id, provider: p });
          }
        }
        this.setModal({
          type: 'model-selector',
          props: { current: (this.runtime.session as any)?.model?.id || 'none', models },
        });
        return;
      }

      case 'compact': {
        try {
          const session = this.runtime.session as any;
          if (typeof session.compact === 'function') {
            await session.compact(args ? { customInstructions: args } : undefined);
            this.addToast('Compaction completed', 'success');
          } else {
            this.addToast('Compaction not supported', 'error');
          }
        } catch (err) {
          this.addToast('Compaction failed', 'error');
        }
        return;
      }

      case 'sessions': {
        const sessionMgr = this.runtime.sessionManager as any;
        const entries = sessionMgr.getEntries?.() || [];
        const currentId = sessionMgr.getSessionId?.() || '';
        const currentCwd = sessionMgr.getCwd?.() || this.runtime.cwd;

        if (!args) {
          let msg = 'Sessions:\n';
          for (const entry of entries) {
            const marker = entry.id === currentId ? ' (current)' : '';
            msg += `  • ${entry.id}${marker}\n`;
          }
          msg += `\nCurrent cwd: ${currentCwd}`;
          msg += '\nUsage: /sessions <session-id> to switch';
          this.addToast(msg, 'info');
          return;
        }

        const targetId = args.trim();
        const entry = entries.find((e: any) => e.id === targetId || e.id.startsWith(targetId));
        if (!entry) {
          this.addToast(`Session not found: ${targetId}`, 'error');
          return;
        }
        if (entry.id === currentId) {
          this.addToast('Already on this session', 'info');
          return;
        }

        const sessionFile = entry.path || entry.sessionFile;
        if (sessionFile && this.runtime.switchSession) {
          const result = await this.runtime.switchSession(sessionFile);
          if (result.cancelled) {
            this.addToast('Session switch cancelled', 'info');
          } else {
            this.messages = [];
            this.onMessageCallback?.(this.messages);
            this.addToast(`Switched to session: ${entry.id}`, 'success');
          }
        } else {
          this.addToast('Session switch not supported', 'error');
        }
        return;
      }

      case 'clear':
        this.messages = [];
        this.onMessageCallback?.(this.messages);
        this.addToast('Screen cleared', 'info');
        return;

      case 'history': {
        if (this.messages.length === 0) {
          this.addToast('No command history', 'info');
          return;
        }
        let msg = 'Command history:\n';
        const recent = this.messages.slice(-10);
        for (const m of recent) {
          const role = m.role === 'user' ? '>' : m.role === 'assistant' ? '<' : '!';
          const content = typeof m.content === 'string' ? m.content : String(m.content || '');
          msg += `  ${role} ${content.slice(0, 60)}${content.length > 60 ? '...' : ''}\n`;
        }
        this.addToast(msg, 'info');
        return;
      }

      case 'theme': {
        const settings = this.runtime.settings as any;
        if (!args) {
          const current = settings.getTheme?.() || 'default';
          this.addToast(`Current theme: ${current}`, 'info');
          return;
        }
        if (settings.setTheme) {
          settings.setTheme(args);
          this.addToast(`Theme set to: ${args}`, 'success');
        } else {
          this.addToast('Theme setting not supported', 'error');
        }
        return;
      }

      case 'tools': {
        const settings = this.runtime.settings as any;
        if (!args) {
          const disabled = settings.getDisabledTools?.() || [];
          const active = (this.runtime.session as any).getActiveTools?.() || [];
          this.addToast(`Active: ${active.join(', ') || 'none'}. Disabled: ${disabled.join(', ') || 'none'}`, 'info');
          return;
        }
        const parts = args.split(' ');
        const action = parts[0];
        const toolName = parts.slice(1).join(' ');
        if (!action || !toolName) {
          this.addToast('Usage: /tools enable|disable <tool-name>', 'info');
          return;
        }
        if (settings.setToolDisabled) {
          settings.setToolDisabled(toolName, action === 'disable');
          this.addToast(`Tool ${toolName} ${action}d`, 'success');
        } else {
          this.addToast('Tool management not supported', 'error');
        }
        return;
      }

      default:
        this.addToast(`Command "/${commandId}" not yet implemented`, 'info');
        return;
    }
  }

  // ============================================================================
  // Internal helpers
  // ============================================================================

  private addUserMessage(text: string): void {
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.onMessageCallback?.(this.messages);
  }

  private addAssistantMessage(text: string): void {
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: text,
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.onMessageCallback?.(this.messages);
  }

  private addToast(message: string, type: ToastItem['type'] = 'info'): void {
    const toast: ToastItem = {
      id: `toast-${Date.now()}`,
      message,
      type,
      createdAt: Date.now(),
    };
    this.toasts.push(toast);
    this.onToastCallback?.(toast);

    // Auto remove after duration
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== toast.id);
      this.onToastCallback?.(toast);
    }, toast.duration || 3000);
  }

  private setModal(modal: ModalState): void {
    this.modal = modal;
    this.onModalCallback?.(this.modal);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  dispose(): void {
    // No-op for now; runtime.dispose() is handled by caller
  }
}
