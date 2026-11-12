// InteractiveController - Thuần TypeScript, không dùng React/Ink
// Nắm giữ AgentSessionRuntime, xử lý slash commands, cung cấp API đơn giản cho UI.

import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';
import type { IndicatorState, OverlayRequest } from '../../tui/ink/controller-bridge.js';
import type { TranscriptItem } from '../../tui/ink/components/Transcript.js';
import { extractMessageText, extractThinkingText } from '../../tui/ink/components/Transcript.js';

/** Gộp text từ kết quả tool (chuỗi hoặc mảng block). */
function textOfToolResult(result: any): string {
  if (!result) return '';
  const content = result.content ?? result;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((c: any) => c?.type === 'text')
    .map((c: any) => c?.text ?? '')
    .join('\n');
}

/** Mô tả gọn một tool call cho transcript. */
function formatToolCall(name: string, args: unknown): string {
  const record = (args ?? {}) as Record<string, unknown>;
  const pick = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
  };
  const detail =
    pick(['command', 'cmd']) ??
    pick(['path', 'file_path', 'filePath']) ??
    pick(['pattern', 'query']) ??
    pick(['url']);
  return detail ? `⚙ ${name}: ${truncateMiddle(detail)}` : `⚙ ${name}`;
}

/** Ánh xạ loại overlay sang loại modal cũ (giữ tương thích getModal()). */
function modalTypeForOverlay(kind: OverlayRequest['kind']): ModalState['type'] {
  switch (kind) {
    case 'model':
      return 'model-selector';
    case 'session':
      return 'session-selector';
    case 'settings':
      return 'settings';
    case 'theme':
      return 'theme-selector';
    case 'thinking':
      return 'thinking';
    case 'help':
      return 'help';
    case 'login':
      return 'login';
    default:
      return 'none';
  }
}

/** Cắt giữa chuỗi dài để vừa một dòng transcript. */
function truncateMiddle(text: string, max = 60): string {
  const flat = text.replace(/[\n\t]+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const half = Math.floor((max - 1) / 2);
  return `${flat.slice(0, half)}…${flat.slice(flat.length - half)}`;
}

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
  private onToastCallback: ((toast: ToastItem, removed?: boolean) => void) | null = null;
  private onModalCallback: ((modal: ModalState) => void) | null = null;
  private onOverlayRequestCallback: ((request: OverlayRequest) => void) | null = null;
  private onOverlayCloseCallback: (() => void) | null = null;
  private onIndicatorCallback: ((state: IndicatorState) => void) | null = null;
  private onEditorClear: (() => void) | undefined;
  private onEditorRead: (() => string) | undefined;

  /** Lịch sử tin nhắn đã gửi (mới nhất trước), dùng cho mũi tên lên/xuống. */
  private history: string[] = [];
  /** id -> message đang stream, để cập nhật nội dung liên tục thay vì nhảy một lần. */
  private streamingId: string | undefined;
  /** id -> tool execution đang chạy, hiển thị trong transcript. */
  private pendingToolIds = new Set<string>();

  constructor(options: InteractiveControllerOptions) {
    this.runtime = options.runtime;
    this.status = {
      model: 'unknown',
      tokens: '0/0',
      cwd: this.runtime.cwd || '.',
      isProcessing: false,
    };

    this.subscribeToRuntime();
    // Nạp lại hội thoại của phiên hiện tại: nếu không, phiên được resume sẽ hiện
    // transcript RỖNG dù session đã có message (pi-mono: renderInitialMessages).
    this.loadTranscriptFromSession();
  }

  /**
   * Đọc tin nhắn của phiên hiện tại vào transcript.
   * Gọi khi khởi tạo và sau mỗi lần chuyển/tạo phiên.
   */
  private loadTranscriptFromSession(): void {
    const session = this.runtime.session as any;
    const raw: any[] = Array.isArray(session?.messages)
      ? session.messages
      : Array.isArray(session?.state?.messages)
        ? session.state.messages
        : [];
    const loaded: ChatMessage[] = [];
    for (const message of raw) {
      const role = message?.role;
      if (role !== 'user' && role !== 'assistant' && role !== 'system' && role !== 'tool') continue;
      const content = message?.content;
      const text = Array.isArray(content)
        ? content.filter((c: any) => c?.type === 'text').map((c: any) => c?.text ?? '').join('\n')
        : String(content ?? '');
      if (!text.trim()) continue;
      loaded.push({
        id: `msg-${loaded.length}-${text.length}-${text.slice(0, 8)}`,
        role,
        content: text,
        timestamp: typeof message?.timestamp === 'number' ? message.timestamp : Date.now(),
      });
    }
    this.messages = loaded;
    this.emitMessages();
    // Lịch sử cho editor: các tin nhắn người dùng, mới nhất trước.
    this.history = loaded.filter((m) => m.role === 'user').map((m) => m.content).reverse();
  }

  /** Phát lại danh sách tin nhắn cho view. */
  private emitMessages(): void {
    this.onMessageCallback?.(this.messages);
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Đăng ký nghe sự kiện của phiên, cho InteractiveMode xử lý trạng thái.
   * Bắt chước vai trò của `session.subscribe` trong pi-mono: mỗi sự kiện
   * được chuyển tới listener, kèm hàm hủy đăng ký.
   */
  subscribeEvents(listener: (event: unknown) => void): () => void {
    const session = this.runtime.session as any;
    if (!session?.subscribe) return () => {};
    return session.subscribe(listener);
  }

  private subscribeToRuntime(): void {
    const unsub = this.subscribeToSession();
    (this as any)._unsub = unsub;
  }

  /**
   * Subscribe to the CURRENT session's events and return the unsubscribe fn.
   *
   * AgentSessionRuntime.switchSession()/newSession() replace the AgentSession
   * object, so a listener registered once in the constructor kept listening to
   * the dead session: after any session switch the controller stopped receiving
   * message/agent events (streaming output froze, isProcessing stayed stuck).
   */
  private subscribeToSession(): (() => void) | undefined {
    const session = this.runtime.session as any;
    if (!session?.subscribe) return undefined;

    const unsub = session.subscribe((event: any) => {
      switch (event.type) {
        case 'agent_start':
          this.setIsProcessing(true);
          this.emitIndicator({ kind: 'working', message: 'Đang làm việc' });
          this.pendingToolIds.clear();
          this.streamingId = undefined;
          break;

        case 'agent_end':
          this.setIsProcessing(false);
          this.emitIndicator({ kind: 'none' });
          this.pendingToolIds.clear();
          this.streamingId = undefined;
          this.refreshStatusFromSession();
          break;

        case 'agent_settled':
          this.setIsProcessing(false);
          this.emitIndicator({ kind: 'none' });
          break;

        case 'message_start': {
          this.setIsProcessing(true);
          const role = event.message?.role;
          if (role === 'user') {
            this.addUserMessage(this.textOfMessage(event.message));
          } else if (role === 'assistant') {
            // Tạo message rỗng, sẽ được cập nhật liên tục trong message_update.
            const id = this.addAssistantMessage('');
            this.streamingId = id;
          }
          break;
        }

        case 'message_update': {
          if (event.message?.role !== 'assistant') break;
          const id = this.streamingId;
          if (!id) break;
          // Cập nhật NỘI DUNG message đang stream: bản cũ bỏ qua hoàn toàn
          // message_update nên chữ chỉ xuất hiện nguyên khối khi kết thúc.
          this.updateMessage(id, this.textOfMessage(event.message));
          for (const content of event.message?.content ?? []) {
            if (content?.type === 'toolCall' && content.id) {
              this.ensureToolMessage(content.id, content.name, content.arguments);
            }
          }
          break;
        }

        case 'message_end': {
          this.setIsProcessing(false);
          // event.message.role có thể bị thiếu ở một số runtime (mock/nhánh chỉ
          // phát message_end). Chỉ bỏ qua khi ROLE được khai báo và khác assistant.
          const role = event.message?.role;
          if (role !== undefined && role !== 'assistant') break;
          const text = this.textOfMessage(event.message);
          if (this.streamingId) {
            this.updateMessage(this.streamingId, text);
          } else if (text.trim()) {
            // Không có message_start đi trước: vẫn phải hiện nội dung.
            this.addAssistantMessage(text);
          }
          const stopReason = event.message?.stopReason;
          if (stopReason === 'error' && event.message?.errorMessage) {
            this.addToast(event.message.errorMessage, 'error');
          }
          this.streamingId = undefined;
          break;
        }

        case 'tool_execution_start': {
          this.setIsProcessing(true);
          this.ensureToolMessage(event.toolCallId, event.toolName, event.args);
          break;
        }

        case 'tool_execution_update': {
          this.updateToolMessage(event.toolCallId, event.partialResult);
          break;
        }

        case 'tool_execution_end': {
          this.updateToolMessage(event.toolCallId, event.result, {
            isError: event.isError,
            durationMs: event.durationMs,
          });
          this.pendingToolIds.delete(event.toolCallId);
          break;
        }

        case 'compaction_start':
          this.emitIndicator({ kind: 'compaction', reason: event.reason });
          break;

        case 'compaction_end':
          this.emitIndicator({ kind: 'none' });
          if (event.aborted) {
            this.addToast(event.reason === 'manual' ? 'Đã hủy nén ngữ cảnh' : 'Tự động nén bị hủy', 'info');
          } else if (event.errorMessage) {
            this.addToast(event.errorMessage, 'error');
          } else if (event.result) {
            this.addToast(`Đã nén ngữ cảnh (${event.result.tokensBefore?.toLocaleString?.() ?? '?'} token)`, 'success');
          }
          // Sau khi nén, transcript bị thay thế: nạp lại từ session.
          this.loadTranscriptFromSession();
          break;

        case 'auto_retry_start':
          this.emitIndicator({
            kind: 'retry',
            attempt: event.attempt ?? 1,
            maxAttempts: event.maxAttempts ?? 1,
            delayMs: event.delayMs ?? 0,
          });
          break;

        case 'auto_retry_end':
          this.emitIndicator({ kind: 'none' });
          if (!event.success) {
            this.addToast(`Thử lại thất bại sau ${event.attempt ?? 1} lần: ${event.finalError || 'Không rõ'}`, 'error');
          }
          break;

        case 'queue_update':
          // Tin nhắn đã xếp hàng chờ agent xử lý.
          break;

        case 'error': {
          this.setIsProcessing(false);
          this.emitIndicator({ kind: 'none' });
          this.addToast(typeof event.message === 'string' ? event.message : 'Lỗi', 'error');
          break;
        }

        default:
          break;
      }
    });
    (this as any)._unsub = unsub;
    return unsub;
  }

  /** Gộp text từ một message (chuỗi hoặc mảng block). */
  private textOfMessage(message: any): string {
    const content = message?.content;
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
      .filter((c: any) => c?.type === 'text')
      .map((c: any) => c?.text ?? '')
      .join('\n');
  }

  /** Gộp thinking từ một message (mảng block). */
  private thinkingOfMessage(message: any): string {
    const content = message?.content;
    if (!Array.isArray(content)) return "";
    const parts: string[] = [];
    for (const block of content) {
      if (block?.type === "thinking" && typeof block.thinking === "string" && block.thinking.trim()) {
        parts.push(block.thinking.trim());
      }
    }
    return parts.join("\n\n");
  }

  /** map id -> thinking để getTranscript() dựng lại đúng khối. */
  private thinkingById = new Map<string, string>();

  /** Gán thinking cho một message id. */
  private attachThinking(id: string, thinking: string): void {
    if (!thinking) return;
    this.thinkingById.set(id, thinking);
  }

  /** Thêm tin nhắn trợ lý rỗng, trả về id để stream cập nhật. */
  private addAssistantMessage(text: string): string {
    const id = `msg-${Date.now()}-${this.messages.length}`;
    this.messages.push({ id, role: 'assistant', content: text, timestamp: Date.now() });
    this.emitMessages();
    return id;
  }

  /** Cập nhật nội dung một message theo id. */
  private updateMessage(id: string, text: string): void {
    const found = this.messages.find((m) => m.id === id);
    if (!found) return;
    if (found.content === text) return;
    found.content = text;
    this.emitMessages();
  }

  /** Đảm bảo có một message mô tả tool call (một lần mỗi toolCallId). */
  private ensureToolMessage(toolCallId: string, toolName: string, args: unknown): string {
    if (this.pendingToolIds.has(toolCallId)) return toolCallId;
    this.pendingToolIds.add(toolCallId);
    const formatted = formatToolCall(toolName, args);
    this.messages.push({
      id: `tool-${toolCallId}`,
      role: 'tool',
      content: formatted,
      timestamp: Date.now(),
    });
    this.emitMessages();
    return toolCallId;
  }

  /** Cập nhật kết quả tool call vào message tương ứng. */
  private updateToolMessage(
    toolCallId: string,
    result: any,
    options?: { isError?: boolean; durationMs?: number },
  ): void {
    const found = this.messages.find((m) => m.id === `tool-${toolCallId}`);
    if (!found) return;
    const text = textOfToolResult(result);
    if (!text) return;
    const suffix = options?.durationMs !== undefined ? ` (${options.durationMs}ms)` : '';
    const next = options?.isError ? `✗ ${text}${suffix}` : `✓ ${text}${suffix}`;
    if (found.content === next) return;
    found.content = next;
    this.emitMessages();
  }

  /** Phát trạng thái chỉ báo cho view. */
  private emitIndicator(state: IndicatorState): void {
    this.onIndicatorCallback?.(state);
  }

  /** Cấp độ suy nghĩ đang áp dụng của phiên. */
  private getCurrentThinkingLevel(): string {
    const session = this.runtime.session as any;
    return session?.thinkingLevel ?? 'off';
  }

  /** Các cấp độ suy nghĩ mô hình hiện tại hỗ trợ. */
  private getAvailableThinkingLevels(): string[] {
    const session = this.runtime.session as any;
    if (typeof session?.getAvailableThinkingLevels === 'function') {
      return session.getAvailableThinkingLevels();
    }
    return ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
  }

  /** Cập nhật status (model/tokens) từ session sau khi đổi model/thinking. */
  private refreshStatusFromSession(): void {
    const session = this.runtime.session as any;
    const model = session?.model;
    // Bản cũ hiển thị model mặc định của SETTINGS; phải là model của PHIÊN đang
    // chạy (có thể đã đổi bằng /model hoặc Ctrl+P).
    this.status.model = model ? `${model.provider}/${model.id}` : this.status.model;
    const usage = (this.runtime as any).getContextUsage?.();
    if (usage) {
      this.status.contextPercent = `${Math.round(usage.percent)}%`;
      this.status.tokens = `${usage.tokens}/${usage.contextWindow}`;
    }
    this.onStatusChangeCallback?.(this.status);
  }

  /** Mở SessionSelector với danh sách phiên khả dụng. */
  private async openSessionSelector(): Promise<void> {
    let sessions: Array<{ id: string; path: string; cwd: string }> = [];
    try {
      sessions = typeof this.runtime.listSessions === 'function' ? await this.runtime.listSessions() : [];
    } catch (err: any) {
      this.addToast(`Không đọc được danh sách phiên: ${err?.message || 'lỗi'}`, 'error');
      return;
    }
    this.requestOverlay({ kind: 'session', props: { sessions } });
  }

  /** Dựng các dòng cài đặt cho bảng /settings. */
  private buildSettingRows(): Array<{ id: string; label: string; value: string; description?: string; values?: string[] }> {
    const settings = this.runtime.settings as any;
    const levels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    return [
      {
        id: 'theme',
        label: 'Chủ đề',
        value: settings.getTheme?.() || 'dark',
        description: 'Giao diện màu của transcript và viền',
        values: ['dark', 'light'],
      },
      {
        id: 'defaultThinkingLevel',
        label: 'Cấp độ suy nghĩ',
        value: settings.getDefaultThinkingLevel?.() || 'off',
        description: 'Mức suy luận mặc định cho mô hình mới',
        values: levels,
      },
    ];
  }


  /** Detach from the old session and attach to the current one. */
  private resubscribeToRuntime(): void {
    const previous = (this as any)._unsub as (() => void) | undefined;
    if (typeof previous === 'function') {
      previous();
    }
    this.subscribeToSession();
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

  /** Lịch sử tin nhắn đã gửi (mới nhất trước) cho editor. */
  getHistory(): readonly string[] {
    return [...this.history];
  }

  /**
   * Dựng transcript đầy đủ cho tầng view.
   *
   * Mỗi tin nhắn trong controller được biến thành TranscriptItem có kind rõ
   * ràng (user / assistant+thinking / tool / bash / summary / system), để
   * Transcript render đúng kiểu từng loại thay vì mọi thứ là một dòng chữ.
   */
  getTranscript(): TranscriptItem[] {
    const items: TranscriptItem[] = [];
    this.messages.forEach((message, index) => {
      const base: TranscriptItem = { id: message.id, kind: "system", index, text: message.content };
      if (message.role === "user") {
        items.push({ ...base, kind: "user" });
        return;
      }
      if (message.role === "assistant") {
        // Tool call / kết quả có marker riêng trong nội dung: tách ra khi có thể.
        const toolInfo = this.parseToolLine(message.content);
        if (toolInfo) {
          items.push({ ...base, kind: "tool", toolName: toolInfo.name, toolArgs: {}, toolPartial: false });
          return;
        }
        const thinking = extractThinkingText([{ type: "text", text: message.content }]);
        // Message đã stream sẽ mang dấu phân cách thinking.
        const split = message.content.split("\u0001");
        if (split.length === 2) {
          items.push({ ...base, kind: "assistant", thinking: split[0], text: split[1] });
          return;
        }
        void thinking;
        const stored = this.thinkingById.get(message.id);
        items.push({
          ...base,
          kind: "assistant",
          thinking: stored,
          text: message.content,
        });
        return;
      }
      if (message.role === "tool") {
        const toolInfo = this.parseToolLine(message.content);
        if (toolInfo) {
          items.push({
            ...base,
            kind: "tool",
            toolName: toolInfo.name,
            toolArgs: {},
            toolResult: {
              content: [{ type: "text", text: toolInfo.detail }],
              isError: toolInfo.isError,
              durationMs: toolInfo.durationMs,
            },
            toolPartial: false,
          });
          return;
        }
        items.push(base);
        return;
      }
      items.push(base);
    });
    return items;
  }

  /** Tách một dòng tool "⚙ name: detail" / "✓ …" / "✗ …" thành struct. */
  private parseToolLine(content: string): { name: string; detail: string; isError: boolean; durationMs?: number } | undefined {
    if (!content.startsWith("⚙") && !content.startsWith("✓") && !content.startsWith("✗")) return undefined;
    const isError = content.startsWith("✗");
    let text = content.slice(1).trim();
    let durationMs: number | undefined;
    const durationMatch = /\((\d+)ms\)\s*$/.exec(text);
    if (durationMatch) {
      durationMs = Number.parseInt(durationMatch[1]!, 10);
      text = text.slice(0, durationMatch.index).trim();
    }
    const colon = text.indexOf(":");
    if (colon === -1) return { name: text || "tool", detail: "", isError, durationMs };
    return { name: text.slice(0, colon).trim(), detail: text.slice(colon + 1).trim(), isError, durationMs };
  }

  /** Cập nhật một cài đặt (bảng settings của view). */
  updateSetting(id: string, value: string): void {
    const settings = this.runtime.settings as any;
    switch (id) {
      case 'theme':
        if (settings?.setTheme) {
          settings.setTheme(value);
          this.applyTheme(value);
        }
        return;
      case 'defaultThinkingLevel':
        if (settings?.setDefaultThinkingLevel) settings.setDefaultThinkingLevel(value);
        return;
      default:
        this.addToast(`Cài đặt "${id}" chưa hỗ trợ đổi từ giao diện.`, 'info');
    }
  }

  /**
   * Yêu cầu view mở một cửa sổ phụ (thay thế ô nhập).
   *
   * Cũng phản chiếu vào ModalState để getModal() vẫn trả đúng loại — nhiều nơi
   * (và test) vẫn đọc modal, và pi-mono dùng showSelector() thay cho editor.
   */
  requestOverlay(request: OverlayRequest): void {
    this.onOverlayRequestCallback?.(request);
    this.setModal({ type: modalTypeForOverlay(request.kind), props: request.props ?? {} });
  }

  /**
   * Xóa nội dung ô nhập (Ctrl+C lần đầu).
   * View giữ ref tới Editor; controller chỉ phát tín hiệu để view thực hiện.
   */
  clearEditor(): void {
    this.onEditorClear?.();
  }

  /** Nội dung ô nhập hiện tại (Ctrl+D chỉ thoát khi rỗng). */
  getEditorText(): string {
    return this.onEditorRead?.() ?? "";
  }

  /** View đăng ký hai hook để controller tương tác với ô nhập. */
  onEditorCallbacks(hooks: { clear: () => void; read: () => string }): void {
    this.onEditorClear = hooks.clear;
    this.onEditorRead = hooks.read;
  }

  /** Yêu cầu view đóng cửa sổ phụ. */
  closeOverlay(): void {
    this.onOverlayCloseCallback?.();
    this.setModal({ type: 'none' });
  }

  onMessage(callback: (messages: ChatMessage[]) => void): void {
    this.onMessageCallback = callback;
    callback(this.messages);
  }

  onStatusChange(callback: (status: RuntimeStatus) => void): void {
    this.onStatusChangeCallback = callback;
    callback(this.status);
  }

  onToast(callback: (toast: ToastItem, removed?: boolean) => void): void {
    this.onToastCallback = callback;
  }

  onModalChange(callback: (modal: ModalState) => void): void {
    this.onModalCallback = callback;
    callback(this.modal);
  }

  onOverlayRequest(callback: (request: OverlayRequest) => void): void {
    this.onOverlayRequestCallback = callback;
  }

  onOverlayClose(callback: () => void): void {
    this.onOverlayCloseCallback = callback;
  }

  onIndicator(callback: (state: IndicatorState) => void): void {
    this.onIndicatorCallback = callback;
  }

  // ============================================================================
  // User actions
  // ============================================================================

  /**
   * Gửi tin nhắn của người dùng.
   *
   * Định tuyến giống pi-mono setupEditorSubmitHandler():
   *   - "/xxx ..."   -> lệnh slash nội bộ (runCommand), KHÔNG đẩy tới LLM
   *   - "!cmd"/"!!cmd" -> chạy bash, kết quả hiện trong transcript
   *   - còn lại      -> session.prompt()
   * Bản cũ đẩy MỌI thứ (kể cả "/help") xuống LLM như tin nhắn thường, nên lệnh
   * slash không bao giờ chạy và người dùng nhận lại câu trả lời vô nghĩa.
   */
  async sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('/')) {
      this.addUserMessage(trimmed);
      const spaceIndex = trimmed.indexOf(' ');
      const commandId = spaceIndex === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIndex);
      const args = spaceIndex === -1 ? undefined : trimmed.slice(spaceIndex + 1).trim();
      await this.runCommand(commandId, args);
      return;
    }

    if (trimmed.startsWith('!')) {
      this.addUserMessage(trimmed);
      const excludeFromContext = trimmed.startsWith('!!');
      const command = excludeFromContext ? trimmed.slice(2).trim() : trimmed.slice(1).trim();
      if (!command) {
        this.addToast('Thiếu lệnh bash sau "!".', 'info');
        return;
      }
      await this.runBashCommand(command, excludeFromContext);
      return;
    }

    this.addUserMessage(trimmed);
    if (!this.history.includes(trimmed)) {
      this.history = [trimmed, ...this.history].slice(0, 100);
    }

    try {
      await this.runtime.prompt(trimmed);
    } catch (err: any) {
      this.addToast(err.message || 'Unknown error', 'error');
    }
  }

  /**
   * Chạy lệnh bash từ chế độ tương tác ("!" / "!!").
   * Kết quả được ghi vào session qua recordBashResult để xuất hiện trong
   * transcript và (trừ khi excludeFromContext) vào ngữ cảnh mô hình.
   */
  private async runBashCommand(command: string, excludeFromContext: boolean): Promise<void> {
    const session = this.runtime.session as any;
    const toolId = `bash-${Date.now()}`;
    this.messages.push({
      id: toolId,
      role: 'tool',
      content: `⚙ bash: ${command.length > 60 ? `${command.slice(0, 30)}…${command.slice(-29)}` : command}`,
      timestamp: Date.now(),
    });
    this.emitMessages();
    try {
      if (typeof session?.executeBash === 'function') {
        const result = await session.executeBash(command, { excludeFromContext });
        session.recordBashResult?.(command, result.output, result.exitCode, result.cancelled ?? false, result.truncated ?? false, result.fullOutputPath, { excludeFromContext });
        this.updateMessage(toolId, `✓ ${result.output || '(không có đầu ra)'}`);
      } else {
        this.addToast('Phiên hiện tại không hỗ trợ chạy bash.', 'error');
      }
    } catch (err: any) {
      this.updateMessage(toolId, `✗ ${err?.message || 'Lỗi không rõ'}`);
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
          this.refreshStatusFromSession();
          this.addToast(`Cấp độ suy nghĩ: ${args}`, 'success');
        } else {
          // Bản cũ truyền this.status.model làm "current" nên hộp thoại hiển thị
          // MÃ MÔ HÌNH ở chỗ phải là CẤP ĐỘ SUY NGHĨ.
          this.requestOverlay({
            kind: 'thinking',
            props: {
              current: this.getCurrentThinkingLevel(),
              levels: this.getAvailableThinkingLevels(),
            },
          });
        }
        return;
      }

      case 'login':
        this.setModal({ type: 'login' });
        return;

      case 'help':
        this.requestOverlay({ kind: 'help' });
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
        await this.openSessionSelector();
        return;

      case 'new': {
        const result = await this.runtime.newSession();
        if (result.cancelled) {
          this.addToast('New session cancelled', 'info');
        } else {
          this.messages = [];
          this.onMessageCallback?.(this.messages);
          // The runtime swapped the AgentSession: re-attach to the new one.
          this.resubscribeToRuntime();
          this.addToast('New session created', 'success');
        }
        return;
      }

      case 'settings':
        this.requestOverlay({ kind: 'settings', props: { settings: this.buildSettingRows() } });
        return;

      case 'model': {
        const modelRegistry = this.runtime.services?.modelRegistry as any;
        const all: any[] = modelRegistry?.getAll?.() || [];
        const models = all.map((m: any) => ({ id: m.id, provider: m.provider, name: m.name }));
        this.requestOverlay({
          kind: 'model',
          props: {
            current: (this.runtime.session as any)?.model?.id || 'none',
            models,
          },
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
        // SessionEntry has no `path`; the switchable list comes from the runtime,
        // which resolves session files across projects.
        const sessions = typeof this.runtime.listSessions === 'function'
          ? await this.runtime.listSessions()
          : [];
        const target = sessions.find((s: any) => s.id === targetId || s.id.startsWith(targetId));
        if (!target) {
          this.addToast(`Session not found: ${targetId}`, 'error');
          return;
        }

        const sessionFile = target.path;
        if (sessionFile && this.runtime.switchSession) {
          const result = await this.runtime.switchSession(sessionFile);
          if (result.cancelled) {
            this.addToast('Session switch cancelled', 'info');
          } else {
            this.messages = [];
            this.onMessageCallback?.(this.messages);
            this.resubscribeToRuntime();
            this.addToast(`Switched to session: ${target.id}`, 'success');
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
          this.requestOverlay({
            kind: 'theme',
            props: { current: settings.getTheme?.() || 'dark', themes: ['dark', 'light'] },
          });
          return;
        }
        if (settings.setTheme) {
          settings.setTheme(args);
        }
        this.applyTheme(args);
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

  private addToast(message: string, type: ToastItem['type'] = 'info'): void {
    const toast: ToastItem = {
      id: `toast-${Date.now()}`,
      message,
      type,
      createdAt: Date.now(),
    };
    this.toasts.push(toast);
    this.onToastCallback?.(toast, false);

    // Auto remove after duration. The view is told explicitly which toast went
    // away: emitting the same object without that flag made views that keep a
    // list append it a second time and never shrink, so the list grew by two
    // entries per toast for the whole session.
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== toast.id);
      this.onToastCallback?.(toast, true);
    }, toast.duration || 3000);
  }

  /**
   * Áp chủ đề qua hệ thống theme thật.
   *
   * Bản cũ ghi escape màu THÔ ra stdout (`\x1b[40m\x1b[37m`) — không đi qua
   * render của Ink nên nó bị ghi đè ở frame kế tiếp, không có reset, và làm
   * desync màn hình (màu loang ra toàn bộ output sau đó). Matrix thậm chí là
   * xanh-trên-xanh nên chữ vô hình. Đổi qua setTheme()/Theme để component dựng
   * lại với màu mới và Ink giữ đúng trạng thái terminal.
   */
  private applyTheme(themeName: string): void {
    if (themeName !== 'dark' && themeName !== 'light') {
      this.addToast(`Chủ đề không hợp lệ: ${themeName}`, 'error');
      return;
    }
    try {
      const { setThemeInstance, loadBuiltinTheme } = require('../../tui/ink/theme/theme.js') as typeof import('../../tui/ink/theme/theme.js');
      setThemeInstance(loadBuiltinTheme(themeName));
      const { requestRenderBus } = require('../../tui/ink/core/RenderBus.js') as typeof import('../../tui/ink/core/RenderBus.js');
      requestRenderBus.publish();
      this.addToast(`Đã đổi chủ đề: ${themeName}`, 'success');
    } catch (error) {
      this.addToast(`Không đổi được chủ đề: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  private setModal(modal: ModalState): void {
    this.modal = modal;
    this.onModalCallback?.(this.modal);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  dispose(): void {
    const unsub = (this as any)._unsub as (() => void) | undefined;
    if (typeof unsub === 'function') {
      unsub();
    }
    (this as any)._unsub = undefined;
  }
}
