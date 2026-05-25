/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    // Auto-focus: default to cancel for safety
    setConfirmed(false);
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      if (confirmed) {
        onConfirm();
      } else {
        onCancel();
      }
      return;
    }

    if (key.leftArrow || key.rightArrow) {
      setConfirmed(prev => !prev);
      return;
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Text bold color="yellow">{title}</Text>
      <Box marginTop={1}>
        <Text>{message}</Text>
      </Box>
      <Box marginTop={1} gap={2}>
        <Text color={confirmed ? 'green' : 'white'}>[Yes]</Text>
        <Text color={!confirmed ? 'green' : 'white'}>[No]</Text>
        <Text dim>← → to navigate, Enter to confirm, Esc to cancel</Text>
      </Box>
    </Box>
  );
};
