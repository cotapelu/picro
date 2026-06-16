/** @jsxImportSource react */
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { InputBox } from '../components/InputBox/InputBox.js';

interface EditorModalProps {
  initialValue: string;
  onSave: (value: string) => void; // can be async
  onCancel?: () => void;
}

export const EditorModal: React.FC<EditorModalProps> = ({ initialValue, onSave, onCancel }) => {
  const [value, setValue] = useState(initialValue);

  return (
    <Box flexDirection="column">
      <Text bold>Edit Input</Text>
      <InputBox
        value={value}
        onChange={setValue}
        onSubmit={() => onSave(value)}
        onEscape={onCancel}
        multiline
        autoFocus
      />
    </Box>
  );
};
