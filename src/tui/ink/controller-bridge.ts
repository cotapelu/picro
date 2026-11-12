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
  /** Đăng ký nghe sự kiện phiên (cho orchestrator). */
  subscribeEvents(listener: (event: unknown) => void): () => void;
}

export type { ChatMessageLike, ToastLike };
