// InteractiveController - Thuần TypeScript, không dùng React/Ink
// Nắm giữ AgentSessionRuntime, xử lý slash commands, cung cấp API đơn giản cho UI.

import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';
import type { IndicatorState, OverlayRequest } from '../../tui/ink/controller-bridge.js';
import type { TranscriptItem } from '../../tui/ink/components/Transcript.js';
import type { SettingRow } from '../../tui/ink/components/SettingsSelector.js';
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

/** Bao quanh tham số shell nếu cần (dùng khi dán đường dẫn ở bash mode). */
function quoteShellArg(value: string): string {
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'bash';
  content: string;
  timestamp: number;
  /**
   * Tool call đi kèm (role 'tool'). Controller giữ dạng struct để transcript
   * render đúng TÊN tool + THAM SỐ thay vì đoán lại từ chuỗi đã định dạng — bản
   * cũ ghi "✓ output" đè lên cả dòng nên `parseToolLine` tách nhầm tên tool
   * thành dòng đầu của output.
   */
  tool?: {
    name: string;
    args: Record<string, unknown>;
    output?: string;
    isError?: boolean;
    durationMs?: number;
    partial?: boolean;
  };
  /** Văn bản thinking của message trợ lý (hiển thị riêng, gập lại). */
  thinking?: string;
  /** Lệnh bash chế độ tương tác. */
  bash?: { command: string; output: string; exitCode?: number; excludeFromContext?: boolean };
}

export interface RuntimeStatus {
  model: string;
  tokens: string;
  cwd: string;
  isProcessing: boolean;
  contextPercent?: string;
  /** Cấp độ suy nghĩ đang dùng (footer hiện "• thinking off/high"). */
  thinkingLevel?: string;
  /** Model thực sự được route tới (virtual model). */
  routedModel?: string;
  /**
   * Thống kê phiên cho footer đầy đủ (pi-mono FooterComponent):
   * ↑input ↓output R cache-read W cache-write CH% cost.
   */
  usage?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    cost: number;
    cacheHitPercent?: number;
  };
  /** Nhánh git của thư mục làm việc (footer dòng 1). */
  gitBranch?: string;
  /** Tên phiên (footer dòng 1). */
  sessionName?: string;
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
  private onShutdownCallback: (() => void) | undefined;
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

    // Đọc model/context NGAY từ phiên: bản cũ chỉ cập nhật ở agent_end nên cho
    // tới khi xong lượt đầu tiên footer luôn hiện "unknown" (pi-mono: footer
    // đọc this.session.model mỗi lần render).
    this.refreshStatusFromSession();

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
          const thinking = this.thinkingOfMessage(event.message);
          if (thinking && id) this.attachThinking(id, thinking);
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
          const thinking = this.thinkingOfMessage(event.message);
          if (this.streamingId) {
            if (thinking) this.attachThinking(this.streamingId, thinking);
            this.updateMessage(this.streamingId, text);
          } else if (text.trim()) {
            // Không có message_start đi trước: vẫn phải hiện nội dung.
            const id = this.addAssistantMessage(text);
            if (thinking) this.attachThinking(id, thinking);
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
    const existing = this.messages.find((m) => m.id === `tool-${toolCallId}`);
    if (existing) {
      // Tham số streaming có thể đến thêm: cập nhật nếu phong phú hơn.
      if (existing.tool && args && Object.keys(args as object).length > Object.keys(existing.tool.args ?? {}).length) {
        existing.tool.args = args as Record<string, unknown>;
        this.emitMessages();
      }
      return toolCallId;
    }
    this.pendingToolIds.add(toolCallId);
    this.messages.push({
      id: `tool-${toolCallId}`,
      role: 'tool',
      content: formatToolCall(toolName, args),
      timestamp: Date.now(),
      tool: { name: toolName, args: (args ?? {}) as Record<string, unknown>, partial: true },
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
    const isError = options?.isError ?? false;
    // Giữ NGUYÊN struct: content chỉ là bản đọc nhanh cho fallback view cũ.
    const summary = text ? `${isError ? '✗' : '✓'} ${truncateMiddle(text, 80)}` : formatToolCall(found.tool?.name ?? 'tool', found.tool?.args);
    if (found.tool) {
      found.tool.output = text || found.tool.output || '';
      found.tool.isError = isError;
      found.tool.partial = options === undefined ? (found.tool.partial ?? true) : false;
      if (options?.durationMs !== undefined) found.tool.durationMs = options.durationMs;
    } else {
      found.tool = {
        name: 'tool',
        args: {},
        output: text,
        isError,
        durationMs: options?.durationMs,
        partial: options === undefined,
      };
    }
    if (found.content === summary) return;
    found.content = summary;
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
    this.status.thinkingLevel = session?.thinkingLevel ?? this.status.thinkingLevel ?? 'off';
    const routed = (this.runtime.session as any)?.routedModel;
    this.status.routedModel = routed?.model ? `${routed.model.provider}/${routed.model.id}` : undefined;
    this.status.sessionName =
      (this.runtime.sessionManager as { getSessionName?: () => string } | undefined)?.getSessionName?.() ??
      this.status.sessionName;
    const usage =
      (this.runtime as any).getContextUsage?.() ?? (this.runtime.session as any)?.getContextUsage?.();
    if (usage) {
      this.status.contextPercent = `${Math.round(usage.percent)}%`;
      this.status.tokens = `${usage.tokens}/${usage.contextWindow}`;
    }
    // Thống kê phiên: input/output/cache/cost cho footer (pi-mono tính một lần
    // rồi cache; ở đây đọc lại mỗi lần đổi trạng thái nên không đắt).
    const stats = (this.runtime as any).getSessionStats?.();
    if (stats) {
      const tokens = stats.tokens ?? {};
      const latest = tokens.cacheRead + tokens.cacheWrite;
      this.status.usage = {
        input: tokens.input ?? 0,
        output: tokens.output ?? 0,
        cacheRead: tokens.cacheRead ?? 0,
        cacheWrite: tokens.cacheWrite ?? 0,
        cost: stats.cost ?? 0,
        cacheHitPercent: latest > 0 ? ((tokens.cacheRead ?? 0) / latest) * 100 : undefined,
      };
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
  /**
   * Các dòng cài đặt cho bảng /settings.
   *
   * Đọc từ SettingsManager thật (hàng chục mục như pi-mono SettingsList) thay vì
   * hai dòng hardcode: nếu không, bảng settings chỉ trạng thái trang trí và
   * người dùng không tinh chinh được hành vi agent.
   */
  private buildSettingRows(): SettingRow[] {
    const settings = this.runtime.settings as any;
    const levels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    const pick = (fn: (() => unknown) | undefined, fallback: string | boolean | number): string => {
      try {
        const value = fn?.();
        if (value === undefined || value === null || value === '') return String(fallback);
        return String(value);
      } catch {
        return String(fallback);
      }
    };

    const rows: SettingRow[] = [
      { id: 'theme', label: 'Chủ đề', value: pick(settings.getTheme, 'dark'), description: 'Màu của transcript và viền', values: ['dark', 'light'] },
      { id: 'defaultThinkingLevel', label: 'Cấp độ suy nghĩ mặc định', value: pick(settings.getDefaultThinkingLevel, 'off'), description: 'Mức suy luận cho mô hình mới', values: levels },
      { id: 'hideThinkingBlock', label: 'Ẩn khối thinking', value: pick(settings.getHideThinkingBlock, false) === 'true' ? 'bật' : 'tắt', description: 'Thu gọn toàn bộ reasoning khi hiện', values: ['tắt', 'bật'] },
      { id: 'defaultProvider', label: 'Provider mặc định', value: pick(settings.getDefaultProvider, '(theo cấu hình)') },
      { id: 'defaultModel', label: 'Model mặc định', value: pick(settings.getDefaultModel, '(theo cấu hình)') },
      { id: 'steeringMode', label: 'Chế độ steer', value: pick(settings.getSteeringMode, 'all'), description: 'Đưa tin nhắn vào giữa lượt', values: ['all', 'one-at-a-time'] },
      { id: 'followUpMode', label: 'Chế độ follow-up', value: pick(settings.getFollowUpMode, 'all'), description: 'Tin nhắn xếp hàng sau lượt', values: ['all', 'one-at-a-time'] },
      { id: 'compactionEnabled', label: 'Tự động nén ngữ cảnh', value: pick(settings.getCompactionEnabled, true) === 'true' ? 'bật' : 'tắt', values: ['tắt', 'bật'] },
      { id: 'retryEnabled', label: 'Tự động thử lại', value: pick(settings.getRetryEnabled, true) === 'true' ? 'bật' : 'tắt', values: ['tắt', 'bật'] },
      { id: 'showImages', label: 'Hiện ảnh trong kết quả tool', value: pick(settings.getShowImages, true) === 'true' ? 'bật' : 'tắt', values: ['tắt', 'bật'] },
      { id: 'showTerminalProgress', label: 'Thanh tiến độ terminal', value: pick(settings.getShowTerminalProgress, true) === 'true' ? 'bật' : 'tắt', values: ['tắt', 'bật'] },
      { id: 'quietStartup', label: 'Khởi động im lặng', value: pick(settings.getQuietStartup, false) === 'true' ? 'bật' : 'tắt', values: ['tắt', 'bật'] },
      { id: 'doubleEscapeAction', label: 'Nhấn Esc 2 lần', value: pick(settings.getDoubleEscapeAction, 'tree'), description: 'Ô nhập rỗng: mở cây phiên hoặc fork', values: ['tree', 'fork', 'none'] },
      { id: 'editorPaddingX', label: 'Đệm ngang ô nhập', value: pick(settings.getEditorPaddingX, 1) },
      { id: 'autocompleteMaxVisible', label: 'Số dòng gợi ý tối đa', value: pick(settings.getAutocompleteMaxVisible, 8) },
      { id: 'autocompleteProvider', label: 'Nguồn gợi ý đường dẫn', value: pick(settings.getAutocompleteProvider, 'fd') },
      { id: 'shellPath', label: 'Đường dẫn shell', value: pick(settings.getShellPath, '(mặc định)') },
      { id: 'shellCommandPrefix', label: 'Tiền tố lệnh shell', value: pick(settings.getShellCommandPrefix, '(không)') },
      { id: 'enableSkillCommands', label: 'Bật lệnh skill', value: pick(settings.getEnableSkillCommands, true) === 'true' ? 'bật' : 'tắt', values: ['tắt', 'bật'] },
      { id: 'transport', label: 'Transport', value: pick(settings.getTransport, 'sse'), values: ['sse', 'websocket', 'polling'] },
      { id: 'imageWidthCells', label: 'Chiều rộng ảnh (cells)', value: pick(settings.getImageWidthCells, 60) },
      { id: 'clearOnShrink', label: 'Xóa màn hình khi thu nhỏ', value: pick(settings.getClearOnShrink, true) === 'true' ? 'bật' : 'tắt', values: ['tắt', 'bật'] },
      { id: 'showHardwareCursor', label: 'Con trỏ phần cứng', value: pick(settings.getShowHardwareCursor, false) === 'true' ? 'bật' : 'tắt', values: ['tắt', 'bật'] },
    ];
    return rows;
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
      if (message.role === "tool" || message.tool) {
        // Tool call: dùng struct đã giữ thay vì đoán lại từ content.
        const tool = message.tool;
        if (tool) {
          items.push({
            ...base,
            kind: "tool",
            text: tool.output ?? "",
            toolName: tool.name,
            toolArgs: tool.args ?? {},
            toolResult: tool.output !== undefined
              ? { content: [{ type: "text", text: tool.output }], isError: tool.isError ?? false, durationMs: tool.durationMs }
              : undefined,
            toolPartial: tool.partial ?? false,
          });
          return;
        }
        // Message tool cũ (không có struct): đoán từ chuỗi.
        const toolInfo = this.parseToolLine(message.content);
        if (toolInfo) {
          items.push({
            ...base,
            kind: "tool",
            text: toolInfo.detail,
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
      if (message.role === "bash" && message.bash) {
        items.push({
          ...base,
          kind: "bash",
          command: message.bash.command,
          output: message.bash.output,
          exitCode: message.bash.exitCode,
          excludeFromContext: message.bash.excludeFromContext,
        });
        return;
      }
      if (message.role === "assistant") {
        const thinking = message.thinking ?? this.thinkingById.get(message.id);
        items.push({ ...base, kind: "assistant", thinking, text: message.content });
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
  /**
   * Áp một cài đặt từ bảng /settings (pi-mono SettingsList onChange).
   *
   * Bảng hiển thị nhiều chục mục nên cần bảng ánh xạ: mỗi id -> setter của
   * SettingsManager + kiểu giá trị (bool/number/enum). Bản cũ chỉ có theme và
   * thinking level nên mọi hàng khác báo "chưa hỗ trợ".
   */
  updateSetting(id: string, value: string): void {
    const settings = this.runtime.settings as any;
    const on = value === 'bật' || value === 'true' || value === 'on';

    const setters: Record<string, () => void> = {
      theme: () => {
        settings?.setTheme?.(value);
        void this.applyTheme(value);
      },
      defaultThinkingLevel: () => settings?.setDefaultThinkingLevel?.(value),
      hideThinkingBlock: () => settings?.setHideThinkingBlock?.(on),
      defaultProvider: () => settings?.setDefaultProvider?.(value),
      defaultModel: () => settings?.setDefaultModel?.(value),
      steeringMode: () => settings?.setSteeringMode?.(value),
      followUpMode: () => settings?.setFollowUpMode?.(value),
      compactionEnabled: () => settings?.setCompactionEnabled?.(on),
      retryEnabled: () => settings?.setRetryEnabled?.(on),
      showImages: () => settings?.setShowImages?.(on),
      showTerminalProgress: () => settings?.setShowTerminalProgress?.(on),
      quietStartup: () => settings?.setQuietStartup?.(on),
      doubleEscapeAction: () => settings?.setDoubleEscapeAction?.(value),
      editorPaddingX: () => settings?.setEditorPaddingX?.(Number.parseInt(value, 10) || 1),
      autocompleteMaxVisible: () => settings?.setAutocompleteMaxVisible?.(Number.parseInt(value, 10) || 8),
      autocompleteProvider: () => settings?.setAutocompleteProvider?.(value),
      shellPath: () => settings?.setShellPath?.(value),
      shellCommandPrefix: () => settings?.setShellCommandPrefix?.(value),
      enableSkillCommands: () => settings?.setEnableSkillCommands?.(on),
      transport: () => settings?.setTransport?.(value),
      imageWidthCells: () => settings?.setImageWidthCells?.(Number.parseInt(value, 10) || 60),
      clearOnShrink: () => settings?.setClearOnShrink?.(on),
      showHardwareCursor: () => settings?.setShowHardwareCursor?.(on),
    };

    const apply = setters[id];
    if (!apply) {
      this.addToast(`Cài đặt "${id}" chưa hỗ trợ đổi từ giao diện.`, 'info');
      return;
    }
    apply();
    // thinking/theme đổi cả hành vi phiên: làm mới trạng thái hiển thị.
    this.refreshStatusFromSession();
    this.addToast(`Đã cập nhật: ${id} = ${value}`, 'success');
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

  /**
   * View đăng ký hook cho ô nhập.
   *
   * Bốn hook thay vì hai: các hành động app (Ctrl+G, Ctrl+V, khôi phục hàng
   * đợi) cần ĐẶT hoặc CHÈN nội dung, không chỉ xóa/đọc.
   */
  onEditorCallbacks(hooks: {
    clear: () => void;
    read: () => string;
    setText?: (text: string) => void;
    insert?: (text: string) => void;
    cursor?: () => number;
  }): void {
    this.onEditorClear = hooks.clear;
    this.onEditorRead = hooks.read;
    this.onEditorSetText = hooks.setText;
    this.onEditorInsert = hooks.insert;
    this.getEditorCursor = hooks.cursor;
  }

  /** Yêu cầu view đóng cửa sổ phụ. */
  closeOverlay(): void {
    this.onOverlayCloseCallback?.();
    this.setModal({ type: 'none' });
  }

  // ============================================================================
  // Hành động theo phím (pi-mono setupKeyHandlers → onAction("app.*"))
  //
  // Các phương thức này từng nằm trong interactive-mode.ts, nhưng
  // startInteractiveApp không bao giờ khởi tạo InteractiveMode: trên thực tế
  // Ctrl+C rơi vào exitOnCtrlC của Ink (tắt app ngay), Ctrl+D/Ctrl+Z/Esc không
  // ai xử lý. Gom về controller — nơi duy nhất cả app thật và test đều dùng.
  // ============================================================================

  private lastSigintTime = 0;
  private lastEscapeTime = 0;
  private toolsExpanded = false;
  private bashMode = false;
  private compactionQueue: Array<{ text: string; mode: 'steer' | 'followUp' }> = [];

  /** Hook cho view: tạm dừng / tiếp tục đường vào terminal (Ctrl+Z). */
  onSuspend?: () => void;
  onResume?: () => void;
  /** Hook cho view: đặt/chèn text ô nhập, đọc vị trí con trỏ. */
  onEditorSetText?: (text: string) => void;
  onEditorInsert?: (text: string) => void;
  private getEditorCursor?: () => number;
  /** Ô nhập đang ở chế độ bash (dòng bắt đầu bằng "!"). */
  onBashModeChange?: (bash: boolean) => void;
  /** Hàng đợi đổi → view cập nhật dock. */
  onQueueChange?: (queue: { steering: string[]; followUp: string[] }) => void;

  /**
   * Phiên đang stream?
   *
   * Runtime bọc session; có runtime chỉ để `isStreaming` trên session nên đọc cả
   * hai để cả app thật lẫn test/runtime tối giản đều đúng.
   */
  private isStreaming(): boolean {
    const runtimeStreaming = (this.runtime as { isStreaming?: boolean }).isStreaming;
    if (typeof runtimeStreaming === 'boolean') return runtimeStreaming;
    return Boolean((this.runtime.session as { isStreaming?: boolean })?.isStreaming);
  }

  /** Ctrl+C: lần đầu xóa ô nhập, hai lần trong 500ms thì thoát. */
  handleCtrlC(): void {
    const now = Date.now();
    if (now - this.lastSigintTime < 500) {
      void this.shutdown();
      return;
    }
    this.lastSigintTime = now;
    this.clearEditor();
  }

  /** Ctrl+D: chỉ thoát khi ô nhập rỗng. */
  handleCtrlD(): void {
    if (this.getEditorText().trim().length === 0) void this.shutdown();
  }

  /**
   * Ctrl+Z: tạm dừng ra nền. Sau SIGCONT phải start lại đường vào của terminal,
   * nếu không sau khi `fg` app không nhận thêm phím nào.
   */
  handleCtrlZ(): void {
    if (process.platform === 'win32') {
      this.addToast('Tạm dừng ra nền không hỗ trợ trên Windows', 'info');
      return;
    }
    const keepAlive = setInterval(() => {}, 2 ** 30);
    const ignoreSigint = () => {};
    process.on('SIGINT', ignoreSigint);
    const onContinue = () => {
      clearInterval(keepAlive);
      process.removeListener('SIGINT', ignoreSigint);
      this.onResume?.();
    };
    process.once('SIGCONT', onContinue);
    try {
      this.onSuspend?.();
      process.kill(0, 'SIGTSTP');
    } catch (error) {
      clearInterval(keepAlive);
      process.removeListener('SIGINT', ignoreSigint);
      process.removeListener('SIGCONT', onContinue);
      this.addToast(`Không tạm dừng được: ${(error as Error)?.message ?? 'lỗi'}`, 'error');
    }
  }

  /**
   * Esc (pi-mono defaultEditor.onEscape): đang stream thì huỷ và khôi phục hàng
   * đợi; đang chạy bash thì huỷ bash; đang bash mode thì xóa ô nhập; ô rỗng thì
   * hai lần trong 500ms mở /tree.
   */
  handleEscape(): void {
    const session = this.runtime.session as any;
    if (this.isStreaming()) {
      const restored = this.restoreQueue();
      (this.runtime as any).abort?.();
      if (restored > 0) this.addToast(`Đã khôi phục ${restored} tin nhắn về ô nhập`, 'info');
      return;
    }
    if (session?.isBashRunning) {
      session.abortBash?.();
      return;
    }
    if (this.bashMode) {
      this.setBashMode(false);
      this.clearEditor();
      return;
    }
    if (this.getEditorText().trim().length === 0) {
      const now = Date.now();
      if (now - this.lastEscapeTime < 500) {
        this.lastEscapeTime = 0;
        void this.runCommand('tree');
        return;
      }
      this.lastEscapeTime = now;
    }
  }

  /** Ctrl+G: mở editor ngoài với nội dung ô nhập. */
  async openExternalEditor(): Promise<void> {
    let result;
    try {
      const { editInExternalEditor } = await import('../../tui/ink/core/ExternalEditor.js');
      result = await editInExternalEditor({
        command: process.env.PICRO_EDITOR ?? process.env.VISUAL ?? process.env.EDITOR ?? 'vi',
        content: this.getEditorText(),
      });
    } catch (error) {
      this.addToast(`Không mở được editor ngoài: ${(error as Error)?.message ?? 'lỗi'}`, 'error');
      return;
    }
    if (result.status === 'complete') {
      this.onEditorSetText?.(result.content);
      return;
    }
    this.addToast(result.message, 'info');
  }

  /**
   * Ctrl+V: dán từ clipboard. File paths dán theo đường dẫn (bash mode thì quote),
   * ảnh và text là dự phòng. Khoảng cách đầu/cuối chỉ thêm khi con trỏ ở giữa chữ.
   */
  pasteFromClipboard(files: string[], text: string): void {
    if (files.length > 0) {
      if (files.some((filePath) => /\p{Cc}/u.test(filePath))) {
        this.addToast('Đường dẫn clipboard chứa ký tự điều khiển', 'error');
        return;
      }
      const payload = this.bashMode ? files.map((f) => quoteShellArg(f)).join(' ') : files.join('\n');
      this.onEditorInsert?.(this.spacedForInsert(payload));
      return;
    }
    if (text) this.onEditorInsert?.(text);
  }

  private spacedForInsert(text: string): string {
    const current = this.getEditorText();
    if (!current) return text;
    const at = this.getEditorCursor?.() ?? current.length;
    const before = current.slice(0, at);
    const after = current.slice(at);
    const leading = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
    const trailing = after.length > 0 && !/^\s/.test(after) ? ' ' : '';
    return `${leading}${text}${trailing}`;
  }

  /** Ctrl+P/Ctrl+N: đổi model và báo trạng thái như pi-mono cycleModel. */
  async cycleModel(direction: 'forward' | 'backward'): Promise<void> {
    try {
      const result = await (this.runtime as any).cycleModel(direction);
      if (!result) {
        this.addToast('Chỉ có một mô hình', 'info');
        return;
      }
      this.refreshStatusFromSession();
      const model = result.model ?? {};
      const name = model.name || model.id || 'model';
      const thinking =
        model.reasoning && result.thinkingLevel && result.thinkingLevel !== 'off'
          ? ` (thinking: ${result.thinkingLevel})`
          : '';
      this.addToast(`Đã đổi sang ${name}${thinking}`, 'success');
    } catch (error: any) {
      this.addToast(error?.message || 'Không đổi được mô hình', 'error');
    }
  }

  /** Đổi cấp độ suy nghī (pi-mono cycleThinkingLevel). */
  cycleThinkingLevel(): void {
    const session = this.runtime.session as any;
    const next =
      typeof session?.cycleThinkingLevel === 'function' ? session.cycleThinkingLevel() : undefined;
    if (!next) {
      this.addToast('Mô hình hiện tại không hỗ trợ suy nghĩ', 'info');
      return;
    }
    this.refreshStatusFromSession();
    this.addToast(`Cấp độ suy nghĩ: ${next}`, 'success');
  }

  /** Ctrl+T: mở rộng/thu gọn toàn bộ đầu ra tool. */
  toggleToolExpansion(): void {
    this.toolsExpanded = !this.toolsExpanded;
    this.addToast(`Đầu ra tool: ${this.toolsExpanded ? 'đã mở rộng' : 'đã thu gọn'}`, 'info');
  }

  getToolsExpanded(): boolean {
    return this.toolsExpanded;
  }

  /** Bật/tắt chế độ bash của ô nhập (đổi màu viền). */
  setBashMode(bash: boolean): void {
    if (this.bashMode === bash) return;
    this.bashMode = bash;
    this.onBashModeChange?.(bash);
  }

  isBashMode(): boolean {
    return this.bashMode;
  }

  // ============================================================================
  // Hàng đợi (pi-mono steering / follow-up)
  // ============================================================================

  getQueue(): { steering: string[]; followUp: string[] } {
    const session = this.runtime.session as any;
    const steering: string[] = [...(session?.getSteeringMessages?.() ?? [])];
    const followUp: string[] = [...(session?.getFollowUpMessages?.() ?? [])];
    for (const item of this.compactionQueue) {
      if (item.mode === 'steer') steering.push(item.text);
      else followUp.push(item.text);
    }
    return { steering, followUp };
  }

  /**
   * Shift+Enter: xếp hàng follow-up khi đang chạy, ngược lại gửi ngay như Enter.
   */
  async queueFollowUp(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.history = [trimmed, ...this.history.filter((h) => h !== trimmed)].slice(0, 100);
    if (!this.isStreaming()) {
      await this.sendMessage(trimmed);
      return;
    }
    try {
      await (this.runtime as any).prompt(trimmed, { streamingBehavior: 'followUp' });
    } catch (error: any) {
      this.addToast(error?.message || 'Không xếp hàng được', 'error');
      return;
    }
    this.clearEditor();
    this.onQueueChange?.(this.getQueue());
  }

  /** Khôi phục toàn bộ hàng đợi về ô nhập (Esc khi đang chạy). */
  restoreQueue(): number {
    const session = this.runtime.session as any;
    const cleared =
      typeof session?.clearQueue === 'function'
        ? session.clearQueue()
        : { steering: [], followUp: [] };
    const compactionSteering = this.compactionQueue.filter((m) => m.mode === 'steer').map((m) => m.text);
    const compactionFollowUp = this.compactionQueue.filter((m) => m.mode === 'followUp').map((m) => m.text);
    this.compactionQueue = [];
    const all = [...(cleared.steering ?? []), ...(cleared.followUp ?? []), ...compactionSteering, ...compactionFollowUp];
    if (all.length === 0) {
      this.onQueueChange?.(this.getQueue());
      return 0;
    }
    const current = this.getEditorText();
    const combined = [all.join('\n\n'), current].filter((t) => t.trim()).join('\n\n');
    this.onEditorSetText?.(combined);
    this.onQueueChange?.(this.getQueue());
    return all.length;
  }

  hasQueuedMessages(): boolean {
    const { steering, followUp } = this.getQueue();
    return steering.length > 0 || followUp.length > 0;
  }

  /** Nạp lại transcript từ phiên hiện tại (sau chuyển phiên / fork / nén). */
  loadTranscript(): void {
    this.loadTranscriptFromSession();
    this.onQueueChange?.(this.getQueue());
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

  /** Chủ app (InteractiveMode) đăng ký hook thoát để khôi phục terminal. */
  onShutdown(callback: () => void): void {
    this.onShutdownCallback = callback;
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
      tool: { name: 'bash', args: { command }, partial: true },
    });
    this.emitMessages();
    try {
      if (typeof session?.executeBash === 'function') {
        const result = await session.executeBash(command, { excludeFromContext });
        session.recordBashResult?.(command, result.output, result.exitCode, result.cancelled ?? false, result.truncated ?? false, result.fullOutputPath, { excludeFromContext });
        const found = this.messages.find((m) => m.id === toolId);
        if (found) {
          found.tool = {
            name: 'bash',
            args: { command },
            output: result.output || '(không có đầu ra)',
            isError: (result.exitCode ?? 0) !== 0,
            partial: false,
          };
        }
        this.emitMessages();
      } else {
        this.addToast('Phiên hiện tại không hỗ trợ chạy bash.', 'error');
      }
    } catch (err: any) {
      const found = this.messages.find((m) => m.id === toolId);
      if (found?.tool) {
        found.tool = { ...found.tool, output: err?.message || 'Lỗi không rõ', isError: true, partial: false };
      }
      this.emitMessages();
    }
    this.setBashMode(false);
  }

  async runCommand(commandId: string, args?: string): Promise<void> {
    switch (commandId) {
      case 'quit':
      case 'exit':
        // Thoát an toàn: dừng phiên rồi mới exit (pi-mono dùng
        // shutdownHandler thay vì process.exit trần để session file được flush).
        void this.shutdown();
        return;

      case 'tree': {
        const tree = (this.runtime as any).getTree?.() ?? [];
        if (!tree || tree.length === 0) {
          this.addToast('Phiên chưa có mục nào.', 'info');
          return;
        }
        this.requestOverlay({
          kind: 'tree',
          props: { tree, currentLeafId: (this.runtime as any).getLeafId?.() ?? null },
        });
        return;
      }

      case 'fork': {
        const userMessages = (this.runtime as any).getUserMessagesForForking?.() ?? [];
        if (userMessages.length === 0) {
          this.addToast('Không có tin nhắn người dùng để fork.', 'info');
          return;
        }
        this.requestOverlay({
          kind: 'fork',
          props: {
            messages: userMessages,
            initialSelectedId: userMessages[userMessages.length - 1]?.entryId,
          },
        });
        return;
      }

      case 'trust': {
        this.requestOverlay({ kind: 'trust', props: {} });
        return;
      }

      case 'login':
      case 'logout': {
        this.requestOverlay({ kind: 'login', props: { mode: commandId } });
        return;
      }

      case 'name':
      case 'session': {
        await this.handleNameCommand(args);
        return;
      }

      case 'hotkeys': {
        this.showHotkeys();
        return;
      }

      case 'changelog': {
        this.addToast('Chưa có changelog trong bản build này.', 'info');
        return;
      }

      case 'debug': {
        this.showDebugInfo();
        return;
      }

      case 'export': {
        await this.handleExportCommand(args);
        return;
      }

      case 'import': {
        await this.handleImportCommand(args);
        return;
      }

      case 'compact': {
        await this.handleCompactCommand(args);
        return;
      }

      case 'reload': {
        await this.handleReloadCommand();
        return;
      }

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

      case 'help':
        this.requestOverlay({ kind: 'help' });
        return;

      case 'copy': {
        // /copy [all]: copy tin nhắn trợ lý cuối hoặc cả hội thoại (pi-mono handleCopyCommand).
        if (args === 'all') {
          const conversation = this.messages.map((m) => {
            const role = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'Tool';
            return `${role}: ${m.content}`;
          }).join('\n\n');
          await this.copyText(conversation, 'Đã copy cả hội thoại');
          return;
        }
        const last = [...this.messages].reverse().find((m) => m.role === 'assistant');
        if (last) await this.copyText(last.content, 'Đã copy tin nhắn cuối');
        else this.addToast('Không có tin nhắn trợ lý để copy', 'info');
        return;
      }

      case 'clone': {
        // /clone: nhân bản phiên hiện tại (pi-mono handleCloneCommand).
        const sessionFile = (this.runtime.sessionManager as any)?.getSessionFilePath?.();
        if (!sessionFile) {
          this.addToast('Phiên hiện tại chưa có tệp để nhân bản.', 'error');
          return;
        }
        const result = await (this.runtime as any).switchSession?.(sessionFile, { reason: 'fork' });
        if (result?.cancelled) {
          this.addToast('Đã hủy nhân bản phiên.', 'info');
          return;
        }
        this.loadTranscript();
        this.resubscribeToRuntime();
        this.addToast('Đã nhân bản phiên.', 'success');
        return;
      }

      case 'share': {
        this.addToast('Chia sẻ phiên chưa khả dụng trong bản build này.', 'info');
        return;
      }

      case 'bug': {
        const lines = [
          `cwd: ${this.runtime.cwd}`,
          `model: ${this.status.model}`,
          '---',
          `hint: ${args ?? '(không có)'}`,
        ];
        try {
          const { writeClipboardText } = await import('../../utils/clipboard.js');
          await writeClipboardText(lines.join('\n'));
        } catch {
          // Bỏ qua: không có clipboard vẫn báo cáo được qua màn hình.
        }
        this.addToast(`Báo cáo lỗi (đã copy): ${args ?? 'không có mô tả'}`, 'info');
        return;
      }

      case 'scoped-models': {
        const session = this.runtime.session as any;
        const scoped: any[] = session?._scopedModels ?? session?.scopedModels ?? [];
        if (scoped.length === 0) {
          this.addToast('Không có mô hình nào bị giới hội.', 'info');
          return;
        }
        const models = scoped.map((m: any) => ({ id: m.id, provider: m.provider, name: m.name }));
        this.requestOverlay({ kind: 'model', props: { current: session?.model?.id, models } });
        return;
      }

      case 'changelog': {
        try {
          const { readFileSync } = await import('node:fs');
          const { fileURLToPath } = await import('node:url');
          const path = await import('node:path');
          const here = path.dirname(fileURLToPath(import.meta.url));
          const changelogPath = path.resolve(here, '../../CHANGELOG.md');
          const text = readFileSync(changelogPath, 'utf8');
          this.addToast(text.split('\n').slice(0, 40).join('\n'), 'info');
        } catch {
          this.addToast('Chưa có changelog trong bản build này.', 'info');
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
        // Có tham số -> đổi model ngay (pi-mono handleModelCommand: tìm đúng mô hình
        // theo provider/id rồi chuyển). Bản cũ BỎ QUA args và luôn mở lại selector,
        // nên chọn model trong overlay chỉ mở lại selector vô hạn.
        const session = this.runtime.session as any;
        const registry = (this.runtime.services?.modelRegistry as any) ?? (this.runtime as any).modelRegistry;
        if (args) {
          const [provider, ...rest] = args.split('/');
          const id = rest.join('/');
          const match = (registry?.getAll?.() ?? []).find(
            (m: any) => m.id === id && (m.provider ?? provider) === (provider || m.provider),
          );
          if (!match) {
            this.addToast(`Không tìm thấy mô hình: ${args}`, 'error');
            return;
          }
          if (typeof session?.setModel === 'function') {
            await session.setModel(match);
          } else if (typeof (this.runtime as any).setModel === 'function') {
            await (this.runtime as any).setModel(match);
          } else {
            this.addToast('Phiên hiện tại không hỗ trợ đổi mô hình.', 'error');
            return;
          }
          this.refreshStatusFromSession();
          this.addToast(`Đã đổi mô hình: ${match.provider}/${match.id}`, 'success');
          this.loadTranscript();
          return;
        }
        const all: any[] = registry?.getAll?.() || [];
        const models = all.map((m: any) => ({ id: m.id, provider: m.provider, name: m.name }));
        this.requestOverlay({
          kind: 'model',
          props: { current: session?.model?.id || 'none', models },
        });
        return;
      }

      // `compact` và `login`/`logout` đã có case ở trên; hai case trùng ở đây là
      // code chết (switch chỉ chạy case khớp ĐẦU TIÊN) nên đã bỏ.
      case 'sessions': {
        // sessionManager có thể không có (runtime tối giản/mock): dùng optional
        // chaining trên CẢ ĐỐI TƯỢNG — bản cũ `sessionMgr.getEntries?.()` với
        // sessionMgr undefined vẫn ném TypeError và `/sessions` crash toàn bộ.
        const sessionMgr = this.runtime.sessionManager as
          | { getEntries?: () => any[]; getSessionId?: () => string; getCwd?: () => string }
          | undefined;
        const entries = sessionMgr?.getEntries?.() || [];
        const currentId = sessionMgr?.getSessionId?.() || '';
        const currentCwd = sessionMgr?.getCwd?.() || this.runtime.cwd;

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
            // Đổi phiên xong phải NẠP LẠI transcript của phiên mới: bản cũ chỉ
            // xoá danh sách nên người dùng thấy màn hình trống dù phiên có nội dung.
            this.loadTranscriptFromSession();
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
        void this.applyTheme(args);
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

  /** Copy text ra clipboard, báo kết quả (pi-mono handleCopyCommand). */
  private async copyText(text: string, okMessage: string): Promise<void> {
    if (!text.trim()) {
      this.addToast('Không có nội dung để copy.', 'info');
      return;
    }
    try {
      const { writeClipboardText } = await import('../../utils/clipboard.js');
      const ok = await writeClipboardText(text);
      this.addToast(ok ? okMessage : 'Clipboard không khả dụng trên máy này.', ok ? 'success' : 'warning');
    } catch (error) {
      this.addToast(`Copy thất bại: ${(error as Error)?.message ?? 'lỗi'}`, 'error');
    }
  }

  /** Thoát an toàn: nhờ chủ app dừng terminal rồi mới exit.
   *
   * pi-mono dùng shutdownHandler của session thay vì process.exit trần, để
   * terminal được khôi phục (raw mode tắt, con trỏ hiện lại) trước khi tiến
   * trình kết thúc. Nếu không có ai đăng ký (ví dụ test), dispose rồi exit.
   */
  private async shutdown(): Promise<void> {
    if (this.onShutdownCallback) {
      this.onShutdownCallback();
      return;
    }
    try {
      this.dispose();
    } catch {
      // dispose là best-effort.
    }
    process.exit(0);
  }

  /** Thoát qua hook của view (khôi phuc terminal) — dùng cho Ctrl+C lần 2. */
  async shutdownViaHook(): Promise<void> {
    await this.shutdown();
  }

  /** /name <tên> — đặt tên phiên. */
  private async handleNameCommand(args?: string): Promise<void> {
    const name = (args ?? '').trim();
    const sessionManager = this.runtime.sessionManager as any;
    if (!name) {
      const current = sessionManager?.getSessionName?.();
      this.addToast(current ? `Tên phiên: ${current}` : 'Phiên chưa có tên. Dùng /name <tên>.', 'info');
      return;
    }
    if (typeof sessionManager?.setSessionName === 'function') {
      sessionManager.setSessionName(name);
      this.addToast(`Đã đặt tên phiên: ${name}`, 'success');
    } else if (typeof (this.runtime.session as any)?.setSessionName === 'function') {
      (this.runtime.session as any).setSessionName(name);
      this.addToast(`Đã đặt tên phiên: ${name}`, 'success');
    } else {
      this.addToast('Phiên hiện tại không hỗ trợ đặt tên.', 'error');
    }
  }

  /** /hotkeys — liệt kê phím tắt và lệnh. */
  private showHotkeys(): void {
    const lines: string[] = [
      'Phím tắt:',
      '  Enter            gửi tin nhắn',
      '  Shift+Enter      xuống dòng',
      '  Ctrl+C           xóa ô nhập (2 lần: thoát)',
      '  Ctrl+D           thoát khi ô nhập rỗng',
      '  Ctrl+Z           tạm dừng ra nền',
      '  PageUp/PageDown  cuộn transcript',
      '  /                lệnh slash',
      '  ! / !!           chạy bash (!! loại khỏi ngữ cảnh)',
      '  @                đính kèm file',
      '',
      'Lệnh:',
      '  /help /model /thinking /settings /theme /compact /sessions',
      '  /new /resume /tree /fork /trust /login /logout /name /hotkeys',
      '  /export /import /reload /debug /quit',
    ];
    this.addToast(lines.join('\n'), 'info');
  }

  /** /debug — thông tin chẩn đoán. */
  private showDebugInfo(): void {
    const usage =
      (this.runtime as any).getContextUsage?.() ?? (this.runtime.session as any)?.getContextUsage?.();
    const lines: string[] = [
      `cwd: ${this.runtime.cwd}`,
      `model: ${this.status.model}`,
      `context: ${usage ? `${usage.tokens}/${usage.contextWindow} (${Math.round(usage.percent)}%)` : 'n/a'}`,
      `processing: ${this.status.isProcessing}`,
      `transcript items: ${this.messages.length}`,
    ];
    this.addToast(lines.join('\n'), 'info');
  }

  /** /export <path> — xuất phiên ra JSONL. */
  private async handleExportCommand(args?: string): Promise<void> {
    const path = (args ?? '').trim();
    if (!path) {
      this.addToast('Cách dùng: /export <file.jsonl>', 'info');
      return;
    }
    try {
      const fs = await import('node:fs');
      const entries = (this.runtime.sessionManager as any).getEntries?.() ?? [];
      const header = (this.runtime.sessionManager as any).getHeader?.() ?? {
        type: 'session',
        id: (this.runtime.sessionManager as any).getSessionId?.(),
        timestamp: new Date().toISOString(),
        cwd: this.runtime.cwd,
      };
      const lines = [JSON.stringify(header), ...entries.map((e: unknown) => JSON.stringify(e))];
      fs.writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
      this.addToast(`Đã xuất phiên ra: ${path}`, 'success');
    } catch (error) {
      this.addToast(`Xuất phiên thất bại: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  /** /import <path> — nhập phiên từ JSONL. */
  private async handleImportCommand(args?: string): Promise<void> {
    const path = (args ?? '').trim();
    if (!path) {
      this.addToast('Cách dùng: /import <file.jsonl>', 'info');
      return;
    }
    if (typeof (this.runtime as any).importFromJsonl !== 'function') {
      this.addToast('Runtime không hỗ trợ nhập phiên.', 'error');
      return;
    }
    const result = await (this.runtime as any).importFromJsonl(path);
    if (result.cancelled) {
      this.addToast('Nhập phiên bị hủy.', 'info');
      return;
    }
    this.loadTranscriptFromSession();
    this.resubscribeToRuntime();
    this.addToast(`Đã nhập phiên từ: ${path}`, 'success');
  }

  /** /compact [ngữ cảnh] — nén ngữ cảnh ngay. */
  private async handleCompactCommand(args?: string): Promise<void> {
    const session = this.runtime.session as any;
    if (typeof session?.compact !== 'function') {
      this.addToast('Phiên hiện tại không hỗ trợ nén ngữ cảnh.', 'error');
      return;
    }
    try {
      await session.compact(args ? { customInstructions: args } : undefined);
      this.loadTranscriptFromSession();
      this.addToast('Compaction completed', 'success');
    } catch (error) {
      this.addToast(`Nén ngữ cảnh thất bại: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  /** /reload — nạp lại tài nguyên (skills, extensions, themes…). */
  private async handleReloadCommand(): Promise<void> {
    const session = this.runtime.session as any;
    if (typeof session?.reload === 'function') {
      try {
        await session.reload();
        this.addToast('Đã nạp lại tài nguyên.', 'success');
        return;
      } catch (error) {
        this.addToast(`Nạp lại thất bại: ${error instanceof Error ? error.message : String(error)}`, 'error');
        return;
      }
    }
    this.addToast('Phiên hiện tại không hỗ trợ nạp lại.', 'error');
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
  private async applyTheme(themeName: string): Promise<void> {
    if (themeName !== 'dark' && themeName !== 'light') {
      this.addToast(`Chủ đề không hợp lệ: ${themeName}`, 'error');
      return;
    }
    try {
      // Import tĩnh, KHÔNG dùng require(): package này là ESM nên `require`
      // không tồn tại lúc runtime và mọi lần đổi theme đều rơi vào catch.
      const { setThemeInstance, loadBuiltinTheme } = await import('../../tui/ink/theme/theme.js');
      setThemeInstance(loadBuiltinTheme(themeName));
      const { requestRenderBus } = await import('../../tui/ink/core/RenderBus.js');
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
