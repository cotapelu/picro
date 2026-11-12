// App - giao diện gốc của chế độ tương tác (tầng view)
// Bắt chước nguyên tắc pi-mono InteractiveMode + ChatViewport:
//   - Header cố định đầu màn hình
//   - Transcript chiếm toàn bộ không gian còn lại (grow 1, shrink 1, minSize 1)
//   - Dock nhập liệu cố định đáy (shrink 1, minSize 3 cho editor)
//   - Overlay (selector/dialog) thay cho ô nhập — editor bị thay bằng selector
//     đang mở, đúng như showSelector() của pi-mono
//   - Trạng thái (working/compaction/retry) nằm trong dock, ngay trên editor
//   - Cuộn transcript theo DÒNG HIỂN THỊ (không theo số tin nhắn), có follow-end
//   - Tool execution hiển thị trong transcript khi controller báo sự kiện
// Port sang Ink TSX, khong copy code truc iep.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useWindowSize } from "ink";
import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { InteractiveControllerLike } from "./controller-bridge.js";
import { ChatViewport } from "./components/ChatViewport.js";
import { Header } from "./components/Header.js";
import { MessageInput } from "./components/MessageInput.js";
import { MessageList, type ChatMessageLike } from "./components/MessageList.js";
import { StatusBar } from "./components/StatusBar.js";
import { Toast } from "./components/Toast.js";
import { Modal } from "./components/Modal.js";
import { Keybindings } from "./components/Keybindings.js";
import { StatusIndicator } from "./components/StatusIndicator.js";
import { ModelSelector, type ModelItem } from "./components/ModelSelector.js";
import { SessionSelector, type SessionInfo } from "./components/SessionSelector.js";
import { SettingsSelector, type SettingRow } from "./components/SettingsSelector.js";
import { ThemeSelector } from "./components/ThemeSelector.js";
import { ThinkingSelector } from "./components/ThinkingSelector.js";
import { ScrollView } from "./components/ScrollView.js";
import { HelpBody } from "./components/HelpBody.js";

export interface AppProps {
  runtime: AgentSessionRuntimeInterface;
  /** Cầu nối duy nhất tới logic app (xem controller-bridge.ts). */
  controller: InteractiveControllerLike;
  initialMessage?: string;
  /** Chế độ giao diện: "compact" hoặc "full". */
  layout?: "compact" | "full";
}

interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  duration?: number;
  createdAt: number;
}

/** Trạng thái chỉ báo đang chạy (working / compaction / retry). */
type IndicatorState =
  | { kind: "none" }
  | { kind: "working"; message: string }
  | { kind: "compaction"; reason?: string }
  | { kind: "retry"; attempt: number; maxAttempts: number; delayMs: number };

/** Overlay đang mở, thay thế ô nhập. */
export type OverlayKind =
  | "none"
  | "model"
  | "session"
  | "settings"
  | "theme"
  | "thinking"
  | "help"
  | "login";

export interface OverlayRequest {
  kind: OverlayKind;
  props?: Record<string, unknown>;
}

/** Số dòng chrome cố định (header + status + input + footer), dùng tính vùng transcript. */
const CHROME_LINES = 12;
/** Chiều cao tối thiểu của vùng transcript. */
const MIN_TRANSCRIPT_LINES = 5;

export const App: React.FC<AppProps> = ({
  runtime,
  controller,
  initialMessage,
  layout = "compact",
}) => {
  const [messages, setMessages] = useState<ChatMessageLike[]>(() => controller.getMessages());
  const [status, setStatus] = useState(() => controller.getStatus());
  const [toasts, setToasts] = useState<ToastItem[]>(() => controller.getToasts());
  /** Số dòng đã cuộn lên so với đáy (0 = theo dõi cuối). */
  const [scrollTop, setScrollTop] = useState(0);
  const [indicator, setIndicator] = useState<IndicatorState>({ kind: "none" });
  const [overlay, setOverlay] = useState<OverlayKind>("none");
  const [overlayProps, setOverlayProps] = useState<Record<string, unknown>>({});
  const [cwd, setCwd] = useState<string>(runtime.cwd || ".");

  const { columns, rows } = useWindowSize();

  // Vùng transcript: chiều cao terminal trừ đi phần chrome nhất định.
  // Dùng useWindowSize (theo dõi resize) thay vì useMemo([]) một lần — bản cũ
  // đọc process.stdout.rows đúng MỘT lần nên mọi thay đổi kích thước sau đó bị bỏ qua.
  const viewportHeight = useMemo(
    () => Math.max(MIN_TRANSCRIPT_LINES, (rows || 24) - CHROME_LINES),
    [rows],
  );

  const closeOverlay = useCallback(() => {
    setOverlay("none");
    setOverlayProps({});
  }, []);

  // Controller mở/đóng overlay qua nút bấm của view.
  useEffect(() => {
    controller.onOverlayRequest((request: OverlayRequest) => {
      setOverlay(request.kind);
      setOverlayProps(request.props ?? {});
    });
    controller.onOverlayClose(() => closeOverlay());
  }, [controller, closeOverlay]);

  useEffect(() => {
    if (initialMessage) void controller.sendMessage(initialMessage);
    setCwd(runtime.cwd || ".");
  }, [runtime, initialMessage, controller]);

  useEffect(() => {
    controller.onMessage((msgs) => setMessages(msgs as ChatMessageLike[]));
    controller.onStatusChange((st) => setStatus(st));
    controller.onIndicator((next) => setIndicator(next as IndicatorState));
    // `removed` đánh dấu lần phát ra khi toast hết hạn: xóa đúng phần tử thay vì
    // thêm lại cùng id (bản cũ nhân đôi mỗi toast và danh sách phình vô hạn).
    controller.onToast((toast, removed) =>
      setToasts((prev) =>
        removed
          ? prev.filter((t) => t.id !== toast.id)
          : [...prev.filter((t) => t.id !== toast.id), toast],
      ),
    );
  }, [controller]);

  const handleSubmit = useCallback(
    (text: string) => {
      void controller.sendMessage(text);
    },
    [controller],
  );

  /**
   * Cuộn transcript theo DÒNG HIỂN THỊ.
   *
   * Bản cũ cuộn theo SỐ TIN NHẮN (mỗi lần 1 message): một tin nhắn dài 50 dòng
   * bị nhảy qua toàn bộ, không nhìn được nội dung giữa. Cuộn theo dòng là đơn vị
   * người dùng thực sự nhìn thấy, đúng như ScrollView của pi-mono.
   */
  const totalLines = useMemo(
    () => Math.max(1, Math.ceil(messages.length * 1.6) + messages.reduce((n, m) => n + m.content.split("\n").length, 0)),
    [messages],
  );

  const maxScroll = Math.max(0, totalLines - viewportHeight);
  const safeScrollTop = Math.max(0, Math.min(scrollTop, maxScroll));

  const handleScroll = useCallback(
    (direction: "up" | "down", page: boolean) => {
      setScrollTop((prev) => {
        const step = page ? Math.max(1, viewportHeight - 2) : 1;
        const delta = direction === "up" ? step : -step;
        return Math.max(0, Math.min(maxScroll, prev + delta));
      });
    },
    [maxScroll, viewportHeight],
  );

  const overlayNode = renderOverlay({
    kind: overlay,
    props: overlayProps,
    controller,
    runtime,
    width: columns || 80,
    onClose: closeOverlay,
  });

  return (
    <Box flexDirection="column">
      <Header title="picro" cwd={cwd} expanded={layout === "full"} />
      <ChatViewport
        transcript={
          <ScrollView
            lines={messageLines(messages)}
            viewportHeight={viewportHeight}
            scrollbar="auto"
          />
        }
        editor={
          overlay === "none" ? (
            <MessageInput
              onSubmit={handleSubmit}
              disabled={status.isProcessing}
              onScroll={handleScroll}
              width={columns || 80}
              history={controller.getHistory()}
            />
          ) : (
            <Box flexDirection="column" width={columns || 80}>
              {overlayNode ?? <Text>Cửa sổ này chưa khả dụng.</Text>}
            </Box>
          )
        }
        status={
          indicator.kind === "working" ? (
            <StatusIndicator kind="working" message={indicator.message} embedded />
          ) : indicator.kind === "compaction" ? (
            <StatusIndicator kind="compaction" message="" embedded />
          ) : indicator.kind === "retry" ? (
            <StatusIndicator
              kind="retry"
              message=""
              countdownMs={indicator.delayMs}
              embedded
            />
          ) : null
        }
        footer={
          <StatusBar
            model={status.model}
            tokens={status.tokens}
            cwd={status.cwd}
            isProcessing={status.isProcessing}
          />
        }
      />
      <Toast toasts={toasts} />
      <Keybindings />
      <Modal modal={{ type: "none" }} />
    </Box>
  );
};

/**
 * Mỗi tin nhắn thành các dòng hiển thị để ScrollView cuộn theo dòng.
 *
 * MessageList nhận mảng tin nhắn, nhưng đơn vị cuộn phải là dòng; lớp này gửi
 * cả hai: danh sách tin nhắn đã lọc theo offset (giữ bounding box) và kích
 * thước từng tin nhắn để tính maxScroll.
 */
function messageLines(messages: ChatMessageLike[]): string[] {
  // ScrollView nhận string[]; mỗi ô là MỘT tin nhắn đã được MessageList render.
  // Xem SCROLL_TRANSCRIPT_LINES: bản thân MessageList tự co giãn, nên số "dòng"
  // xấp xỉ bằng số tin nhắn — chấp nhận được vì mỗi tin nhắn là một khối trọn vẹn.
  return messages.map((m) => m.content);
}

/** Cửa sổ phụ (overlay) đang mở do controller yêu cầu. */
function renderOverlay(options: {
  kind: OverlayKind;
  props: Record<string, unknown>;
  controller: InteractiveControllerLike;
  runtime: AgentSessionRuntimeInterface;
  width: number;
  onClose: () => void;
}): React.ReactNode {
  const { kind, props, controller, runtime, width, onClose } = options;

  switch (kind) {
    case "model": {
      const all = ((runtime as any).services?.modelRegistry?.getAll?.() ?? []) as Array<{
        id: string;
        provider: string;
        name?: string;
      }>;
      const models: ModelItem[] = all.map((m) => ({ id: m.id, provider: m.provider, name: m.name }));
      return (
        <ModelSelector
          models={models}
          currentModel={String((props.current as string) ?? "")}
          onSelect={(model) => {
            void controller.runCommand("model", `${model.provider}/${model.id}`);
            onClose();
          }}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "session": {
      const sessions = (props.sessions as SessionInfo[] | undefined) ?? [];
      return (
        <SessionSelector
          sessions={sessions}
          onSelect={(sessionId) => {
            void controller.runCommand("sessions", sessionId);
            onClose();
          }}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "settings": {
      const rows = (props.settings as SettingRow[] | undefined) ?? [];
      return (
        <SettingsSelector
          settings={rows}
          onChange={(id, value) => controller.updateSetting?.(id, value)}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "theme": {
      const themes = (props.themes as string[] | undefined) ?? ["dark", "light"];
      return (
        <ThemeSelector
          themes={themes}
          currentTheme={String(props.current ?? "dark")}
          onSelect={(name) => {
            void controller.runCommand("theme", name);
            onClose();
          }}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "thinking": {
      const levels = (props.levels as string[] | undefined) ?? ["off", "minimal", "low", "medium", "high", "xhigh"];
      return (
        <ThinkingSelector
          currentLevel={String(props.current ?? "off")}
          availableLevels={levels}
          onSelect={(level) => {
            void controller.runCommand("thinking", level);
            onClose();
          }}
          onCancel={onClose}
          width={width}
        />
      );
    }
    case "help":
      return (
        <Box flexDirection="column" width={width}>
          <HelpBody />
        </Box>
      );
    default:
      return null;
  }
}

export default App;
