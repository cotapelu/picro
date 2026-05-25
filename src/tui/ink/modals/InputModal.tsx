/** @jsxImportSource react */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { InputBox } from '../components/InputBox/InputBox.js';
import { Modal } from './Modal.js';

interface InputModalProps {
  title: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const InputModal: React.FC<InputModalProps> = ({ title, placeholder, onSubmit, onCancel }) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim() !== '') {
      onSubmit(value);
    } else {
      onCancel();
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      handleSubmit();
      return;
    }
  });

  return (
    <Modal onClose={onCancel}>
      <Box flexDirection="column">
        <Text bold>{title}</Text>
        <InputBox
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={placeholder}
          multiline={false}
          autoFocus
        />
      </Box>
    </Modal>
  );
};

