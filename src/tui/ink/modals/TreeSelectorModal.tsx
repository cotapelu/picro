/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../types/agent-session';
import { useTheme } from '../hooks/useTheme';
import { Modal } from './Modal';

interface TreeSelectorModalProps {
  runtime: AgentSessionRuntimeInterface;
  onClose: () => void;
}

export const TreeSelectorModal: React.FC<TreeSelectorModalProps> = ({ runtime, onClose }) => {
  const { theme } = useTheme();
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    // Load branches from session manager
    try {
      const manager = (runtime.session as any)?.sessionManager;
      if (manager?.getBranch) {
        const branchList = manager.getBranch();
        setBranches(branchList.map((b: any) => b.id || String(b)));
      } else {
        setBranches(['main']);
      }
    } catch {
      setBranches(['main']);
    }
  }, [runtime]);

  const handleKey = (input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      // Switch to selected branch
      const branchId = branches[selectedIndex];
      // TODO: Implement branch switching
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(branches.length - 1, prev + 1));
      return;
    }
  };

  useInput(handleKey);

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text bold color="cyan">Session Tree</Text>
        <Box flexDirection="column" marginTop={1}>
          {branches.map((branch, idx) => (
            <Box key={branch}>
              <Text color={idx === selectedIndex ? theme.selectedForeground || 'white' : theme.foreground}>
                {idx === selectedIndex ? '> ' : '  '}
                {branch}
              </Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text dim>↑↓ navigate, Enter switch, Esc cancel</Text>
        </Box>
      </Box>
    </Modal>
  );
};
