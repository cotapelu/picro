/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Session {
  id: string;
  path: string;
  cwd: string;
}

interface SessionSelectorModalProps {
  runtime: any; // AgentSessionRuntimeInterface
  onClose: () => void;
}

export const SessionSelectorModal: React.FC<SessionSelectorModalProps> = ({ runtime, onClose }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await runtime.listSessions() as any[];
        setSessions(list);
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

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text color="cyan" bold>Select Session to Resume</Text>
      <Box flexDirection="column" marginTop={1}>
        {sessions.map((session, idx) => (
          <Box key={session.path}>
            <Text
              color={idx === selectedIndex ? 'white' : 'gray'}
              backgroundColor={idx === selectedIndex ? 'blue' : undefined}
            >
              {idx === selectedIndex ? '> ' : '  '}
              {session.id.slice(0, 8)} ({session.cwd})
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dim>↑↓ to navigate, Enter to select, Esc to cancel</Text>
      </Box>
    </Box>
  );
};
