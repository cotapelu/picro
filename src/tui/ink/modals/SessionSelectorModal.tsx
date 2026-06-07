/** @jsxImportSource react */
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import { SessionManager } from '../../../session/session-manager.js';
import { unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as os from 'node:os';

interface Session {
  id: string;
  path: string;
  cwd: string;
  modified?: Date;
  name?: string;
  firstMessage?: string;
}

interface SessionSelectorModalProps {
  runtime: any;
  onClose: () => void;
  setActiveModal: (modal: any) => void;
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

/**
 * Modal for selecting a session to resume.
 * Supports navigation, loading states, errors, rename, delete, create new.
 */
export const SessionSelectorModal: React.FC<SessionSelectorModalProps> = ({ runtime, onClose, setActiveModal, addToast }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  // Auto-focus this modal
  const { focus } = useFocus();
  useEffect(() => { focus(); }, [focus]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await runtime.listSessions();
      const sorted = list.sort((a: any, b: any) => {
        const dateA = a.modified?.getTime() || 0;
        const dateB = b.modified?.getTime() || 0;
        return dateB - dateA;
      });
      setSessions(sorted);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRename = () => {
    const session = sessions[selectedIndex];
    if (!session) return;
    const currentName = session.name || '';
    setActiveModal({
      type: 'input',
      title: 'Rename Session',
      placeholder: 'Session name',
      initialValue: currentName,
      onSubmit: async (newName: string) => {
        setActiveModal(null);
        const name = newName.trim();
        if (!name) return;
        try {
          const mgr = SessionManager.open(session.path);
          mgr.appendSessionInfo(name);
          addToast(`Session renamed to: ${name}`, 'success');
          loadSessions();
        } catch (err: any) {
          addToast('Failed to rename session: ' + err.message, 'error');
        }
      },
      onCancel: () => {}
    });
  };

  const handleDelete = () => {
    const session = sessions[selectedIndex];
    if (!session) return;
    setActiveModal({
      type: 'confirmation',
      title: 'Delete Session',
      message: `Delete session "${session.name || 'session'}"? This cannot be undone.`,
      onConfirm: async () => {
        setActiveModal(null);
        try {
          let deleted = false;
          // Try trash first
          try {
            const trashResult = spawnSync('trash', [session.path], { encoding: 'utf-8' });
            if (trashResult.status === 0) {
              deleted = true;
            }
          } catch {}
          if (!deleted || existsSync(session.path)) {
            if (existsSync(session.path)) {
              await unlink(session.path);
            }
          }
          addToast('Session deleted', 'success');
          loadSessions();
        } catch (err: any) {
          addToast('Failed to delete session: ' + err.message, 'error');
        }
      },
      onCancel: () => {}
    });
  };

  const handleCreateNew = async () => {
    try {
      const result = await runtime.newSession();
      if (result.cancelled) {
        addToast('New session cancelled', 'info');
      } else {
        addToast('New session created', 'success');
        loadSessions();
      }
    } catch (err: any) {
      addToast('Failed to create session: ' + (err as Error).message, 'error');
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    // Shortcuts
    if (key.ctrl && input === 'r') {
      handleRename();
      return;
    }
    if (key.ctrl && input === 'd') {
      handleDelete();
      return;
    }
    if (key.ctrl && input === 'n') {
      handleCreateNew();
      return;
    }

    if (key.return) {
      if (sessions[selectedIndex]) {
        const session = sessions[selectedIndex];
        runtime.switchSession(session.path).then((result: any) => {
          if (!result.cancelled) {
            onClose();
          }
        }).catch((err: any) => {
          console.error('Failed to switch session:', err);
        });
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(sessions.length - 1, prev + 1));
      return;
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text color="cyan">Loading sessions...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">Error: {error}</Text>
        <Text dim>Press Esc to close</Text>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
        <Text color="yellow">No sessions found.</Text>
        <Text dim>Press Esc to close</Text>
      </Box>
    );
  }

  const formatDate = (d: Date) => d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text color="cyan" bold>Select Session to Resume</Text>
      <Box flexDirection="column" marginTop={1}>
        {sessions.map((session, idx) => {
          const displayName = session.name || session.firstMessage?.substring(0, 50) || session.id.slice(0, 8);
          const dateStr = session.modified ? formatDate(session.modified) : '';
          const line = idx === selectedIndex ? `> ${displayName}` : `  ${displayName}`;
          return (
            <Box key={session.path} flexDirection="column">
              <Text
                color={idx === selectedIndex ? 'white' : 'gray'}
                backgroundColor={idx === selectedIndex ? 'blue' : undefined}
              >
                {line}
              </Text>
              {dateStr && (
                <Text dim color={idx === selectedIndex ? 'white' : 'gray'}>
                  {dateStr} - {session.cwd}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dim>↑↓ navigate · Enter select · Ctrl+N new · Ctrl+R rename · Ctrl+D delete · Esc cancel</Text>
      </Box>
    </Box>
  );
};
