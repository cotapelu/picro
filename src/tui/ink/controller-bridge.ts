// ControllerBridge - CẦU NỐI DUY NHẤT giữa tầng view (tui) và logic app (interactive)
// Tầng view chỉ cần biết "controller có thể làm gì", không cần biết lớp cụ thể.
// Nhờ vậy src/tui/ink không import bất cứ thứ gì từ src/modes/interactive lúc runtime;
// file .ts duy nhất bên kia chỉ cần hiện thực interface này.
// Bắt chước vai trò của AgentSession/InteractiveMode bridge trong pi-mono.

import type { ChatMessageLike } from "./components/MessageList.js";
import type { ToastLike } from "./components/Toast.js";

/** Trạng thái hiển thị tối thiểu mà view cần. */
export interface ControllerStatus {
  model: string;
  tokens: string;
  cwd: string;
  isProcessing: boolean;
}

/** Chỉ báo trạng thái cho dock nhập liệu (working / compaction / retry). */
export type IndicatorState =
  | { kind: "none" }
  | { kind: "working"; message: string }
  | { kind: "compaction"; reason?: string }
  | { kind: "retry"; attempt: number; maxAttempts: number; delayMs: number };

/** Cửa sổ phụ yêu cầu mở (model/session/settings/theme/thinking/help/login). */
export interface OverlayRequest {
  kind: "none" | "model" | "session" | "settings" | "theme" | "thinking" | "help" | "login";
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
  /** Báo trạng thái đang chạy để dock hiển thị chỉ báo. */
  onIndicator(callback: (state: IndicatorState) => void): void;
  /** Đăng ký nghe sự kiện phiên (cho orchestrator). */
  subscribeEvents(listener: (event: unknown) => void): () => void;
}

export type { ChatMessageLike, ToastLike };
