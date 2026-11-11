// App - Ink TUI chính cho picro agent
// Layout bắt chước nguyên tắc pi-mono InteractiveMode + ChatViewport:
//   - Header cố định đầu màn hình (BuiltInHeader)
//   - Messages area chiếm toàn bộ không gian còn lại (flexGrow=1), follow end
//   - Input dock cố định đáy (flexShrink=0), không bị cuộn lên
//   - StatusBar ngay dưới input (như FooterComponent)
//   - Toast, Modal, Keybindings ở lớp trên cùng
// Chỉ Input component đăng ký useInput; các component khác không lung tung bắt phím.

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Text,
  useApp,
  useWindowSize,
} from "ink";
import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { InteractiveController } from "../../modes/interactive/interactive-controller.js";
import { Header } from "./components/Header.js";
import { Input } from "./components/Input.js";
import { VirtualMessageList } from "./components/VirtualMessageList.js";
import { Modal } from "./components/Modal.js";
import { StatusBar } from "./components/StatusBar.js";
import { Toast } from "./components/Toast.js";
import { Keybindings } from "./components/Keybindings.js";

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
  type: "none" | "login" | "help" | "thinking" | "confirmation" |
        "session-selector" | "model-selector" | "settings" | "custom" | "theme-selector";
  props?: Record<string, any>;
}

export const App: React.FC<AppProps> = ({ runtime, controller, initialMessage }) => {
  const [messages, setMessages] = useState<Message[]>(controller.getMessages());
  const [status, setStatus] = useState<{ model: string; tokens: string; cwd: string; isProcessing: boolean }>(controller.getStatus());
  const [modal, setModal] = useState<ModalState>(controller.getModal());
  const [toasts, setToasts] = useState<ToastItem[]>(controller.getToasts());
  const [cwd, setCwd] = useState<string>(runtime.cwd || ".");

  const { exit } = useApp();
  const { columns, rows } = useWindowSize();

  // Tính toán chiều cao vùng hiển thị tin nhắn (gộp header, statusbar, input vào)
  const availableHeight = rows ? Math.max(5, rows - 8) : 20;

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

    return () => {
      // cleanup nếu cần
    };
  }, [controller]);

  const handleSubmit = useCallback((text: string) => {
    void controller.sendMessage(text);
  }, [controller]);

  return (
    <Box flexDirection="column">
      <Header key="header" title="picro" cwd={cwd} />
      <Box key="messages-box" flexDirection="column" flexGrow={1} padding={1}>
        <VirtualMessageList key="message-list" messages={messages} viewportHeight={availableHeight} viewportWidth={columns} />
      </Box>
      <Box key="input-dock" flexShrink={0} paddingBottom={1}>
        <Input key="input" onSubmit={handleSubmit} placeholder="> " />
      </Box>
      <StatusBar key="statusbar" model={status.model} tokens={status.tokens} cwd={status.cwd} isProcessing={status.isProcessing} />
      <Toast key="toast" toasts={toasts} />
      {modal.type !== "none" && (
        <Modal key="modal" modal={{ ...modal }} />
      )}
      <Keybindings key="keybindings" />
    </Box>
  );
}
