// App - Ink TUI chính cho picro agent
// Layout bắt chước nguyên tắc pi-mono InteractiveMode + ChatViewport:
//   - Header cố định đầu màn hình
//   - Messages area chiếm toàn bộ không gian còn lại, follow end
//   - Input dock cố định đáy, không bị cuộn lên
//   - StatusBar ngay dưới input
//   - Toast/Modal phủ lên trên nội dung
// Chỉ Input nhận sự kiện bàn phím và chuyển tiếp tín hiệu cuộn.
// Port sang Ink TSX, khong copy code truc iep.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, useApp, useWindowSize } from "ink";
import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { InteractiveController } from "../../modes/interactive/interactive-controller.js";
import { Header } from "./components/Header.js";
import { Input } from "./components/Input.js";
import { VirtualMessageList } from "./components/VirtualMessageList.js";
import { Modal } from "./components/Modal.js";
import { StatusBar } from "./components/StatusBar.js";
import { Toast } from "./components/Toast.js";
import { Keybindings } from "./components/Keybindings.js";
import { theme } from "./theme.js";

interface AppProps {
  runtime: AgentSessionRuntimeInterface;
  controller: InteractiveController;
  initialMessage?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
}

interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  duration?: number;
  createdAt: number;
}

interface ModalState {
  type:
    | "none"
    | "login"
    | "help"
    | "thinking"
    | "confirmation"
    | "session-selector"
    | "model-selector"
    | "settings"
    | "custom"
    | "theme-selector";
  props?: Record<string, any>;
  onConfirm?: (result?: any) => void;
  onCancel?: () => void;
}

/** Số dòng chrome cố định của bố cục, dùng để tính vùng xem tin nhắn. */
const CHROME_LINES = 12;

export const App: React.FC<AppProps> = ({ runtime, controller, initialMessage }) => {
  const [messages, setMessages] = useState<Message[]>(() => controller.getMessages());
  const [status, setStatus] = useState(() => controller.getStatus());
  const [modal, setModal] = useState<ModalState>(() => controller.getModal());
  const [toasts, setToasts] = useState<ToastItem[]>(() => controller.getToasts());
  const [cwd, setCwd] = useState<string>(runtime.cwd || ".");

  const { exit } = useApp();
  const { columns, rows } = useWindowSize();

  // Chiều cao vùng tin nhắn = chiều cao terminal trừ phần chrome.
  const viewportHeight = useMemo(
    () => Math.max(5, (rows || 24) - CHROME_LINES),
    [rows],
  );

  // State cuộn của transcript, App giữ để Input chuyển tiếp phím.
  const [scrollOffset, setScrollOffset] = useState(0);
  const maxScroll = useMemo(
    () => Math.max(0, messages.length - Math.min(viewportHeight, messages.length || 1)),
    [messages.length, viewportHeight],
  );

  useEffect(() => {
    if (scrollOffset > maxScroll) setScrollOffset(maxScroll);
  }, [scrollOffset, maxScroll]);

  useEffect(() => {
    if (initialMessage) {
      void controller.sendMessage(initialMessage);
    }
    setCwd(runtime.cwd || ".");
  }, [runtime, initialMessage, controller]);

  useEffect(() => {
    controller.onMessage((msgs) => setMessages(msgs));
    controller.onStatusChange((st) => setStatus(st));
    controller.onToast((t) => setToasts((prev) => [...prev, t]));
    controller.onModalChange((m) => setModal(m));
  }, [controller]);

  const handleSubmit = useCallback(
    (text: string) => {
      void controller.sendMessage(text);
      setScrollOffset(0);
    },
    [controller],
  );

  // Chỉ Input nhận bàn phím; các phím cuộn được ủy quyền từ Input qua đây.
  const handleScroll = useCallback(
    (delta: number, page: boolean) => {
      setScrollOffset((prev) => {
        const step = page ? Math.max(1, viewportHeight - 2) : 1;
        const next = prev - Math.sign(delta) * step;
        return Math.max(0, Math.min(maxScroll, next));
      });
    },
    [maxScroll, viewportHeight],
  );

  const handleModalSubmit = useCallback(
    (result: any) => {
      modal.onConfirm?.(result);
    },
    [modal],
  );

  return (
    <Box flexDirection="column">
      <Header title="picro" cwd={cwd} />

      <Box flexGrow={1} flexDirection="column">
        <VirtualMessageList
          messages={messages}
          viewportHeight={viewportHeight}
          viewportWidth={columns}
          scrollOffset={scrollOffset}
        />
      </Box>

      <Box flexShrink={0} flexDirection="column">
        <Input
          onSubmit={handleSubmit}
          placeholder="Nhập tin nhắn… (/help để xem lệnh)"
          disabled={status.isProcessing}
        />
        <StatusBar
          model={status.model}
          tokens={status.tokens}
          cwd={status.cwd}
          isProcessing={status.isProcessing}
        />
      </Box>

      <Toast toasts={toasts} />
      {modal.type !== "none" ? <Modal modal={modal} /> : null}
      <Keybindings />
    </Box>
  );
};

export default App;
