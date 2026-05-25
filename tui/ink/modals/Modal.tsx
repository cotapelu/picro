/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';

interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
}

export const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      justifyContent="center"
      alignItems="center"
      backgroundColor="black"
    >
      <Box borderStyle="round" borderColor="white" padding={1}>
        {children}
      </Box>
    </Box>
  );
};
