// App - Ink TUI chính cho picro agent
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  useApp,
  useInput,
} from 'ink';
import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Input } from './components/Input.js';
import { MessageList } from './components/MessageList.js';
import { Modal } from './components/Modal.js';
import { StatusBar } from './components/StatusBar.js';
import { Toast } from './components/Toast.js';

interface AppProps {
  runtime: AgentSessionRuntimeInterface;
  initialMessage?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
}

interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
  createdAt: number;
}

interface ModalState {
  type: 'none' | 'login' | 'help' | 'thinking' | 'confirmation' |
        'session-selector' | 'model-selector' | 'settings' | 'custom';
  props?: Record<string, any>;
}

export const App: React.FC<AppProps> = ({ runtime, initialMessage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cwd, setCwd] = useState<string>(runtime.cwd || '.');

  const { exit } = useApp();

  // Khởi tạo tin nhắn ban đầu
  useEffect(() => {
    if (initialMessage) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: initialMessage,
          timestamp: Date.now(),
        },
      ]);
    }
    setCwd(runtime.cwd || '.');
  }, [runtime, initialMessage]);

  // Đăng ký sự kiện từ runtime
  useEffect(() => {
    const session = runtime.session as any;
    if (!session?.subscribe) return;

    const unsub = session.subscribe((event: any) => {
      switch (event.type) {
        case 'agent_start':
          setIsProcessing(true);
          break;
        case 'agent_end':
          setIsProcessing(false);
          break;
        case 'message_start':
          setIsProcessing(true);
          break;
        case 'message_end': {
          setIsProcessing(false);
          const content = event.message?.content || '';
          const text = Array.isArray(content)
            ? content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
            : String(content);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: text,
              timestamp: Date.now(),
            },
          ]);
          break;
        }
        case 'error': {
          setIsProcessing(false);
          setToasts((prev) => [
            ...prev,
            {
              id: `toast-${Date.now()}`,
              message: event.message || 'Error',
              type: 'error',
              createdAt: Date.now(),
            },
          ]);
          break;
        }
      }
    });
    return () => unsub?.();
  }, [runtime]);

  // Xử lý Ctrl+C
  useInput((inputString, key) => {
    if (key.ctrl && inputString === '\u0003') {
      exit();
      process.exit(0);
    }
  });

  // Xử lý submit input
  const handleSubmit = useCallback((text: string) => {
    if (!text.trim()) return;

    // Kiểm tra slash command
    if (text.startsWith('/')) {
      const parts = text.split(' ');
      const commandId = parts[0].slice(1);
      const args = parts.slice(1).join(' ');

      setToasts((prev) => [
        ...prev,
        {
          id: `toast-${Date.now()}`,
          message: `Command: /${commandId} ${args}`,
          type: 'info',
          createdAt: Date.now(),
        },
      ]);
    } else {
      // Gửi tin nhắn bình thường
      setMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() },
      ]);
      setInputValue('');
      runtime.prompt(text).catch((err: any) => {
        setToasts((prev) => [
          ...prev,
          { id: `toast-${Date.now()}`, message: err.message, type: 'error', createdAt: Date.now() },
        ]);
      });
    }
  }, [runtime]);

  // Thêm toast helper
  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    setToasts((prev) => [
      ...prev,
      { id: `toast-${Date.now()}`, message, type, createdAt: Date.now() },
    ]);
  }, []);

  const maxMsgHeight = 20;

  return (
    <Box flexDirection="column">
      <Header key="header" title="picro" cwd={cwd} />
      <Box key="messages-box" flexDirection="column" padding={1}>
        <MessageList messages={messages} maxHeight={maxMsgHeight} />
      </Box>
      <StatusBar key="statusbar" model="unknown" tokens="0/0" cwd={cwd} isProcessing={isProcessing} />
      <Input key="input" onSubmit={handleSubmit} placeholder="> " value={inputValue} />
      <Toast key="toast" toasts={toasts} />
      {modal.type !== 'none' && <Modal key="modal" modal={{ ...modal }} />}
    </Box>
  );
};
