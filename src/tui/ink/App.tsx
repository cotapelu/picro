// App - giao diện gốc của chế độ tương tác (tầng view)
// Bắt chước nguyên tắc pi-mono InteractiveMode + ChatViewport:
//   - Header cố định đầu màn hình
//   - Transcript chiếm toàn bộ không gian còn lại (grow 1)
//   - Dock nhập liệu cố định đáy (shrink 0), editor giữ tối thiểu 3 dòng
//   - StatusBar ngay dưới ô nhập
//   - Toast/Modal phủ lên trên nội dung
// Phím cuộn được ủy quyền từ MessageInput (component duy nhất nhận useInput).
// Port sang Ink TSX, khon copy code truc iep.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box } from "ink";
import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { InteractiveControllerLike } from "./controller-bridge.js";
import { ChatViewport } from "./components/ChatViewport.js";
import { Header } from "./components/Header.js";
import { MessageInput } from "./components/MessageInput.js";
import { VirtualMessageList } from "./components/VirtualMessageList.js";
import { StatusBar } from "./components/StatusBar.js";
import { Toast } from "./components/Toast.js";
import { Modal } from "./components/Modal.js";
import { Keybindings } from "./components/Keybindings.js";

interface AppProps {
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

/** Số dòng chrome cố định, dùng để tính vùng xem transcript. */
const CHROME_LINES = 10;

export const App: React.FC<AppProps> = ({
  runtime,
  controller,
  initialMessage,
  layout = "compact",
}) => {
  const [messages, setMessages] = useState(() => controller.getMessages());
  const [status, setStatus] = useState(() => controller.getStatus());
  const [toasts, setToasts] = useState<ToastItem[]>(() => controller.getToasts());
  const [scrollOffset, setScrollOffset] = useState(0);
  const [cwd, setCwd] = useState<string>(runtime.cwd || ".");

  const viewportHeight = useMemo(
    () => Math.max(5, (process.stdout.rows || 24) - CHROME_LINES),
    [],
  );

  const maxScroll = useMemo(
    () => Math.max(0, messages.length - Math.min(viewportHeight, messages.length || 1)),
    [messages.length, viewportHeight],
  );

  useEffect(() => {
    if (scrollOffset > maxScroll) setScrollOffset(maxScroll);
  }, [scrollOffset, maxScroll]);

  useEffect(() => {
    if (initialMessage) void controller.sendMessage(initialMessage);
    setCwd(runtime.cwd || ".");
  }, [runtime, initialMessage, controller]);

  useEffect(() => {
    controller.onMessage((msgs) => setMessages(msgs));
    controller.onStatusChange((st) => setStatus(st));
    // `removed` marks the emission when a toast expires: drop that entry instead
    // of appending the same id again (which duplicated every toast and made the
    // local list grow without bound).
    controller.onToast((toast, removed) =>
      setToasts((prev) =>
        removed
          ? prev.filter((t) => t.id !== toast.id)
          : [...prev.filter((t) => t.id !== toast.id), toast]
      )
    );
  }, [controller]);

  const handleSubmit = useCallback(
    (text: string) => {
      void controller.sendMessage(text);
      setScrollOffset(0);
    },
    [controller],
  );

  // Phím cuộn từ MessageInput: âm là cuộn lên xem lịch sử.
  const handleScroll = useCallback(
    (direction: "up" | "down", page: boolean) => {
      setScrollOffset((prev) => {
        const step = page ? Math.max(1, viewportHeight - 2) : 1;
        const delta = direction === "up" ? step : -step;
        return Math.max(0, Math.min(maxScroll, prev + delta));
      });
    },
    [maxScroll, viewportHeight],
  );

  return (
    <Box flexDirection="column">
      <Header title="picro" cwd={cwd} expanded={layout === "full"} />
      <ChatViewport
        transcript={
          <VirtualMessageList
            messages={messages}
            viewportHeight={viewportHeight}
            viewportWidth={process.stdout.columns || 80}
            scrollOffset={scrollOffset}
          />
        }
        editor={
          <MessageInput
            onSubmit={handleSubmit}
            disabled={status.isProcessing}
            onScroll={handleScroll}
            width={process.stdout.columns || 80}
          />
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
    </Box>
  );
};

export default App;
