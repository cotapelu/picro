// ControllerBridge - CẦU NỐI DUY NHẤT giữa tầng view (tui) và logic app (interactive)
// Tầng view chỉ cần biết "controller có thể làm gì", không cần biết lớp cụ thể.
// Nhờ vậy src/tui/ink không import bất cứ thứ gì từ src/modes/interactive lúc runtime;
// file .ts duy nhất bên kia chỉ cần hiện thực interface này.
// Bắt chước vai trò của AgentSession/InteractiveMode bridge trong pi-mono.

import type { ChatMessageLike } from "./components/MessageList.js";
import type { ToastLike } from "./components/Toast.js";
import type { TranscriptItem } from "./components/Transcript.js";

/** Trạng thái hiển thị tối thiểu mà view cần. */
export interface ControllerStatus {
  model: string;
  tokens: string;
  cwd: string;
  isProcessing: boolean;
  /** Phần trăm ngữ cảnh đã dùng, ví dụ "42%". */
  contextPercent?: string;
}

/** Chỉ báo trạng thái cho dock nhập liệu (working / compaction / retry). */
export type IndicatorState =
  | { kind: "none" }
  | { kind: "working"; message: string }
  | { kind: "compaction"; reason?: string }
  | { kind: "retry"; attempt: number; maxAttempts: number; delayMs: number };

/** Cửa sổ phụ yêu cầu mở (model/session/settings/theme/thinking/help/login/tree/fork/trust). */
export interface OverlayRequest {
  kind:
    | "none"
    | "model"
    | "session"
    | "settings"
    | "theme"
    | "thinking"
    | "help"
    | "login"
    | "tree"
    | "fork"
    | "trust";
  props?: Record<string, unknown>;
}

/** Giao diện view cần từ controller — không phụ thuộc lớp cụ thể bên app. */
export interface InteractiveControllerLike {
  /** Lấy tin nhắn hiện tại (để render lần đầu). */
  getMessages(): ChatMessageLike[];
  /** Lấy trạng thái hiện tại. */
  getStatus(): ControllerStatus;
  /** Lấy thông báo tạm hiện có. */
  getToasts(): ToastLike[];

  /** Đăng ký nghe tin nhắn thay đổi. */
  onMessage(callback: (messages: ChatMessageLike[]) => void): void;
  /** Đăng ký nghe trạng thái thay đổi. */
  onStatusChange(callback: (status: ControllerStatus) => void): void;
  /** Đăng ký nghe thông báo tạm mới.
   *  `removed` đánh dấu lần phát ra khi thông báo vừa hết hạn bị gỡ, để view
   *  xoá đúng phần tử thay vì chỉ biết cách thêm. */
  onToast(callback: (toast: ToastLike, removed?: boolean) => void): void;

  /**
   * Transcript đầy đủ cho tầng view: mỗi tin nhắn kèm kind (user / assistant +
   * thinking / tool / bash / summary) để render đúng kiểu.
   */
  getTranscript(): TranscriptItem[];
  /** Báo cho view rằng transcript đã thay đổi (chuyển phiên, fork, nén…). */
  loadTranscript?(): void;
  /** Tin nhắn đang chờ (steering + follow-up), hiển thị trong dock nhập liệu. */
  getQueue?(): { steering: string[]; followUp: string[] };
  /** Đưa nội dung ô nhập vào hàng đợi follow-up (Alt+Enter). */
  queueFollowUp?(text: string): Promise<void>;
  /** Khôi phục toàn bộ hàng đợi về ô nhập. */
  restoreQueue?(): number;
  /** Gửi tin nhắn của người dùng. */
  sendMessage(text: string): Promise<void>;
  /** Chạy một lệnh slash theo id (vd "model", "thinking", "quit"). */
  runCommand(commandId: string, args?: string): Promise<void>;
  /** Cập nhật một cài đặt theo id (dùng cho bảng settings). */
  updateSetting?(id: string, value: string): void;
  /** Lịch sử tin nhắn đã gửi để editor duyệt bằng mũi tên lên/xuống. */
  getHistory(): readonly string[];

  /** Yêu cầu view mở một cửa sổ phụ (thay thế ô nhập). */
  onOverlayRequest(callback: (request: OverlayRequest) => void): void;
  /** Yêu cầu view đóng cửa sổ phụ đang mở. */
  onOverlayClose(callback: () => void): void;
  /** Đăng ký hook thoát để /quit khôi phục terminal trước khi exit. */
  onShutdown?(callback: () => void): void;
  /** Báo trạng thái đang chạy để dock hiển thị chỉ báo. */
  onIndicator(callback: (state: IndicatorState) => void): void;
  /** Đăng ký nghe sự kiện phiên (cho orchestrator). */
  subscribeEvents(listener: (event: unknown) => void): () => void;
  /** Hủy đăng ký sự kiện khi TUI đóng (tránh rò rỉ listener). */
  dispose?(): void;
  /** Xóa nội dung ô nhập (Ctrl+C lần đầu). */
  clearEditor?(): void;
  /** Đọc nội dung ô nhập (Ctrl+D chỉ thoát khi rỗng). */
  getEditorText?(): string;
  /** View đăng ký hook để controller xóa/đọc/đặt/chèn ô nhập. */
  onEditorCallbacks?(hooks: {
    clear: () => void;
    read: () => string;
    setText?: (text: string) => void;
    insert?: (text: string) => void;
    cursor?: () => number;
  }): void;
  /** Ctrl+T đang bật hay tắt (view đọc lần đầu). */
  getToolsExpanded?(): boolean;
  /** Hàng đợi thay đổi (view cập nhật dock). */
  onQueueChange?:(queue: { steering: string[]; followUp: string[] }) => void;
  /** Ô nhập vào/ra chế độ bash (view đổi màu viền). */
  onBashModeChange?:(bash: boolean) => void;
  /** Ctrl+Z: view tạm dừng/khôi phục đường vào terminal. */
  onSuspend?:() => void;
  onResume?:() => void;

  // --- Hành động ứng dụng (pi-mono `onAction("app.*")`) -------------------
  /** Ctrl+C: lần đầu xóa ô nhập, hai lần liên tiếp thì thoát. */
  handleCtrlC?(): void;
  /** Ctrl+D: chỉ thoát khi ô nhập rỗng. */
  handleCtrlD?(): void;
  /** Ctrl+Z: tạm dừng ra nền, khôi phục khi tiếp tục. */
  handleCtrlZ?(): void;
  /** Esc: huỷ đang chạy / thoát bash mode / mở tree hoặc fork khi ô rỗng. */
  handleEscape?(): void;
  /** Ctrl+G: mở editor ngoài. */
  openExternalEditor?(): Promise<void>;
  /** Ctrl+V: dán từ clipboard (file / ảnh / text). */
  pasteFromClipboard?(files: string[], text: string): void;
  /** Ctrl+P/Ctrl+N: đổi model. */
  cycleModel?(direction: "forward" | "backward"): Promise<void>;
  /** Đổi cấp độ suy nghĩ. */
  cycleThinkingLevel?(): void;
  /** Ctrl+T: mở rộng/thu gọn toàn bộ đầu ra tool. */
  toggleToolExpansion?(): void;
  /** Đang có tin nhắn nào trong hàng đợi không (dùng cho trạng thái phím). */
  hasQueuedMessages?(): boolean;
  /** Thoát qua hook của view (khôi phục terminal trước khi exit). */
  shutdownViaHook?(): Promise<void>;
}

export type { ChatMessageLike, ToastLike };
