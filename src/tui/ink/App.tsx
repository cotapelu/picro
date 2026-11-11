// App - Ink TUI chính cho picro agent
// Port ý tưởng từ pi-mono interactive-mode.ts
// Viết lại bằng Ink TSX, không copy code
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Text,
  useApp,
  useInput,
  useWindowSize,
} from "ink";
import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { InteractiveController } from "../../modes/interactive/interactive-controller.js";
import { Header } from "./components/Header.js";
import { Footer } from "./components/Footer.js";
import { Input } from "./components/Input.js";
import { MessageList } from "./components/MessageList.js";
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

  // Khởi tạo tin nhắn ban đầu
  useEffect(() => {
    if (initialMessage) {
      controller.sendMessage(initialMessage);
    }
    setCwd(runtime.cwd || ".");
  }, [runtime, initialMessage, controller]);

  // Đăng ký callbacks từ controller
  useEffect(() => {
    controller.onMessage((msgs) => setMessages(msgs));
    controller.onStatusChange((st) => setStatus(st));
    controller.onToast((t) => setToasts((prev) => [...prev, t]));
    controller.onModalChange((m) => setModal(m));

    return () => {
      // cleanup nếu cần
    };
  }, [controller]);

  // Xử lý Ctrl+C
  useInput((inputString, key) => {
    if (key.ctrl && inputString === "\u0003") {
      exit();
      process.exit(0);
    }
  });

  // Xử lý submit input
  const handleSubmit = useCallback((text: string) => {
    controller.sendMessage(text);
  }, [controller]);

  // Tính toán số lượng tin nhắn có thể hiển thị trong viewport
  // Trừ đi header, footer, input, status bar
  const availableHeight = Math.max(5, rows - 8);

  return (
    <Box flexDirection="column">
      <Header key="header" title="picro" cwd={cwd} />
      <Box key="messages-box" flexDirection="column" padding={1}>
        <MessageList key="message-list" messages={messages} viewportHeight={availableHeight} viewportWidth={columns} />
      </Box>
      <StatusBar key="statusbar" model={status.model} tokens={status.tokens} cwd={status.cwd} isProcessing={status.isProcessing} />
      <Input key="input" onSubmit={handleSubmit} placeholder="> " />
      <Toast key="toast" toasts={toasts} />
      {modal.type !== "none" && (
        <Modal key="modal" modal={{ ...modal }} />
      )}
      <Keybindings key="keybindings" />
    </Box>
  );
}
