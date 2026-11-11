// SessionSelector - port ý tưởng từ pi-mono session-selector.ts
// Chọn session với tìm kiếm, sắp xếp, xóa
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime/index.js';

interface SessionSelectorProps {
  runtime: AgentSessionRuntimeInterface;
  onSelect: (sessionId: string) => void;
  onCancel: () => void;
}

interface SessionInfo {
  id: string;
  path?: string;
  cwd?: string;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({ runtime, onSelect, onCancel }) => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const sessionMgr = runtime.sessionManager as any;
    const entries = sessionMgr.getEntries?.() || [];
    setSessions(
      entries.map((e: any) => ({
        id: e.id,
        path: e.path,
        cwd: e.cwd,
      }))
    );
  }, [runtime]);

  useInput((inputString, key) => {
    if (key.ctrl && inputString === '\u0003') {
      onCancel();
      return;
    }
    if (key.return) {
      const selected = sessions[currentIndex];
      if (selected) {
        onSelect(selected.id);
      }
      return;
    }
    if (key.backspace) {
      setSearch(search.slice(0, -1));
      return;
    }
    if (key.upArrow) {
      setCurrentIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setCurrentIndex((i) => Math.min(sessions.length - 1, i + 1));
      return;
    }
    if (inputString && inputString.length === 1 && inputString.charCodeAt(0) >= 32) {
      setSearch((s) => s + inputString);
    }
  });

  const filtered = sessions.filter((s) => s.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold>Session Selector</Text>
      <Text>Search: {search}</Text>
      <Box flexDirection="column">
        {filtered.map((s, i) => (
          <Text key={s.id} color={i === currentIndex ? 'cyan' : 'white'}>
            {i + 1}. {s.id} {s.cwd ? `(${s.cwd})` : ''}
          </Text>
        ))}
        {filtered.length === 0 && <Text>No sessions found</Text>}
      </Box>
      <Text dimColor>↑/↓: select, Enter: confirm, Ctrl+C: cancel</Text>
    </Box>
  );
};
