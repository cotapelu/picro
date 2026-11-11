// Modal - hiển thị modal dialog (login, help, thinking, confirmation, settings)
// Port từ pi-mono Modal component
import React from 'react';
import { Box, Text } from 'ink';

interface ModalProps {
  modal: {
    type: 'none' | 'login' | 'help' | 'thinking' | 'confirmation' |
          'session-selector' | 'model-selector' | 'settings' | 'custom' | 'theme-selector';
    props?: Record<string, any>;
    onConfirm?: (result?: any) => void;
    onCancel?: () => void;
  };
}

const renderModalContent = (modal: ModalProps['modal']): React.ReactNode => {
  switch (modal.type) {
    case 'help':
      return (
        <Box>
          <Text bold>Help</Text>
          <Text>/thinking [off|minimal|low|medium|high|xhigh] - Set thinking level</Text>
          <Text>/login - Login to provider</Text>
          <Text>/copy [all] - Copy conversation</Text>
          <Text>/resume - Resume previous session</Text>
          <Text>/new - Create new session</Text>
          <Text>/quit - Exit</Text>
        </Box>
      );
    case 'thinking':
      return (
        <Box>
          <Text bold>Thinking Level</Text>
          <Text>Current: {modal.props?.current || 'medium'}</Text>
          <Text>Options: off, minimal, low, medium, high, xhigh</Text>
        </Box>
      );
    case 'login':
      return (
        <Box>
          <Text bold>Login</Text>
          <Text>Enter your API key when prompted</Text>
          <Text>(saved to ~/.pi/agent/auth.json)</Text>
        </Box>
      );
    case 'confirmation':
      return (
        <Box>
          <Text bold>{modal.props?.title || 'Confirm'}</Text>
          <Text>{modal.props?.message || ''}</Text>
        </Box>
      );
    case 'settings':
      return (
        <Box>
          <Text bold>Settings</Text>
          <Text>Theme: {modal.props?.theme || 'default'}</Text>
          <Text>Disabled tools: {modal.props?.disabledTools?.join(', ') || 'none'}</Text>
        </Box>
      );
    case 'session-selector':
      return (
        <Box>
          <Text bold>Session Selector</Text>
          {modal.props?.sessions?.length ? (
            <Box>
              {modal.props.sessions.map((s: any, i: number) => (
                <Text key={i}>{i + 1}. {s.id}</Text>
              ))}
            </Box>
          ) : (
            <Text>No saved sessions</Text>
          )}
        </Box>
      );
    case 'model-selector':
      return (
        <Box>
          <Text bold>Model Selector</Text>
          <Text>Current: {modal.props?.current || 'none'}</Text>
        </Box>
      );
    case 'theme-selector':
      return (
        <Box>
          <Text bold>Theme Selector</Text>
          <Text>Current: {modal.props?.current || 'default'}</Text>
          <Text>Options: dark, light, matrix</Text>
        </Box>
      );
    default:
      return <Text>Modal: {modal.type}</Text>;
  }
};

export const Modal: React.FC<ModalProps> = ({ modal }) => {
  if (modal.type === 'none') return null;

  return (
    <Box
      position="absolute"
      left={10}
      right={10}
      top={5}
      bottom={5}
      borderStyle="round"
      borderColor="magenta"
      padding={2}
      backgroundColor="black"
    >
      {renderModalContent(modal)}
    </Box>
  );
};
