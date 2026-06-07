/** @jsxImportSource react */
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';
import { useTheme } from '../hooks/useTheme.js';
import { Modal } from './Modal.js';

interface UserMessageItem {
  id: string; // Entry ID in the session
  text: string; // The message text
  timestamp?: string; // Optional timestamp if available
}

interface UserMessageSelectorModalProps {
  runtime: AgentSessionRuntimeInterface;
  onClose: () => void;
  onForkResult?: (selectedText: string) => void;
}

export const UserMessageSelectorModal: React.FC<UserMessageSelectorModalProps> = ({ runtime, onClose }) => {
  const { theme } = useTheme();
  // Auto-focus this modal
  const { setFocus } = useFocus();
  useEffect(() => { setFocus(); }, [setFocus]);
  const [messages, setMessages] = useState<UserMessageItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const maxVisible = 10;

  // Load user messages from session
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const extRuntime = runtime as any;
        const session = extRuntime.session;
        if (!session) return;

        const sessionManager = session.sessionManager;
        if (!sessionManager) return;

        const entries = sessionManager.getEntries?.() || [];
        const userMessages: UserMessageItem[] = entries
          .filter((entry: any) => entry.type === 'message' && entry.message?.role === 'user')
          .map((entry: any) => ({
            id: entry.id,
            text: extractTextFromContent(entry.message.content),
            timestamp: entry.timestamp,
          }))
          .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

        setMessages(userMessages);
        if (userMessages.length > 0) {
          setSelectedIndex(userMessages.length - 1);
        }
      } catch (err) {
        console.error('Failed to load user messages:', err);
      }
    };
    loadMessages();
  }, [runtime]);

  const extractTextFromContent = (content: any): string => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
    }
    return String(content || '');
  };

  const handleKey = useCallback((input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      if (messages.length === 0) return;
      const selected = messages[selectedIndex];
      if (selected) {
        // Fork at this entry
        runtime.fork(selected.id).then((result: any) => {
          if (result.cancelled) {
            // Fork was cancelled
          } else {
            // Fork succeeded – notify parent with selectedText if available
            if (result.selectedText && typeof onForkResult === 'function') {
              onForkResult(result.selectedText);
            }
          }
        }).catch((err: any) => {
          console.error('Fork failed:', err);
        });
        onClose();
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => prev === 0 ? messages.length - 1 : prev - 1);
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => prev === messages.length - 1 ? 0 : prev + 1);
      return;
    }
  }, [messages, selectedIndex, runtime, onClose]);

  useInput(handleKey);

  const visibleCount = Math.min(maxVisible, messages.length);
  const startIndex = Math.max(0, Math.min(selectedIndex - Math.floor(visibleCount / 2), messages.length - visibleCount));
  const endIndex = Math.min(startIndex + visibleCount, messages.length);

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor={theme.accent} padding={1} width={80}>
        <Text bold color={theme.accent}>Fork from Message</Text>
        <Text dim>Select a user message to copy the active path up to that point into a new session</Text>
        <Box flexDirection="column" marginTop={1}>
          {messages.length === 0 ? (
            <Text color="muted">No user messages found</Text>
          ) : (
            messages.slice(startIndex, endIndex).map((msg, idx) => {
              const globalIndex = startIndex + idx;
              const isSelected = globalIndex === selectedIndex;
              const cursor = isSelected ? theme.fg(theme.accent, '> ') : '  ';

              // First line: message preview
              const normalizedText = msg.text.replace(/\n/g, ' ').trim();
              const maxWidth = 78 - cursor.length;
              const truncated = normalizedText.length > maxWidth ? normalizedText.slice(0, maxWidth) + '...' : normalizedText;
              const line1 = cursor + (isSelected ? theme.bold(truncated) : truncated);

              // Second line: metadata
              const metadata = `  Message ${globalIndex + 1} of ${messages.length}`;
              const line2 = theme.fg('muted', metadata);

              return (
                <Box key={msg.id} flexDirection="column">
                  <Text>{line1}</Text>
                  <Text>{line2}</Text>
                  <Text> </Text>
                </Box>
              );
            })
          )}
        </Box>
        {startIndex > 0 || endIndex < messages.length ? (
          <Text dim> ({selectedIndex + 1}/{messages.length})</Text>
        ) : null}
        <Box marginTop={1}>
          <Text dim>↑↓ navigate · Enter to fork · Esc to cancel</Text>
        </Box>
      </Box>
    </Modal>
  );
};
