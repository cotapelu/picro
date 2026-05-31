/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';

interface Session {
  id: string;
  path: string;
  cwd: string;
  modified?: Date;
  name?: string;
  firstMessage?: string;
}

interface SessionSelectorModalProps {
  runtime: any; // AgentSessionRuntimeInterface
  onClose: () => void;
}

export const SessionSelectorModal: React.FC<SessionSelectorModalProps> = ({ runtime, onClose }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  // Auto-focus this modal
  const { setFocus } = useFocus();
  useEffect(() => { setFocus(); }, [setFocus]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await runtime.listSessions();
        // Sort by modified descending (most recent first)
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
    })();
  }, [runtime]);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
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

  const formatDate = (d: Date) => d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

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
        <Text dim>↑↓ to navigate, Enter to select, Esc to cancel</Text>
      </Box>
    </Box>
  );
};
