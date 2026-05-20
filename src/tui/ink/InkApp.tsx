/** @jsxImportSource react */
import React, { useCallback } from 'react';
import { render, Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../types/agent-session';
import type { Message } from './types';
import { ThemeProvider } from './hooks/useTheme';
import { useRuntime } from './hooks/useRuntime';
import { Header } from './components/Header/Header';
import { MessageList } from './components/MessageList/MessageList';
import { InputBox } from './components/InputBox/InputBox';
import { Footer } from './components/Footer/Footer';
import { CommandPalette } from './modals/CommandPalette';
import { ThinkingModal } from './modals/ThinkingModal';
import { LoginModal } from './modals/LoginModal';
import { Modal } from './modals/Modal';

interface InkAppInnerProps {
  runtime: AgentSessionRuntimeInterface;
}

type ModalState =
  | { type: 'command-palette' }
  | { type: 'thinking' }
  | { type: 'login' }
  | { type: 'editor'; initialValue: string; onSave: (value: string) => Promise<void> }
  | null;

const InkAppInner: React.FC<InkAppInnerProps> = ({ runtime }) => {
  const { messages, status, thinkingLevel, sendMessage } = useRuntime(runtime);
  const [inputValue, setInputValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeModal, setActiveModal] = React.useState<ModalState>(null);
  const [showDebug, setShowDebug] = React.useState(false);
  const messageListRef = React.useRef<{ scrollToBottom: () => void } | null>(null);

  // Handle input submission
  const handleSubmit = useCallback(async () => {
    if (inputValue.trim() === '' || isSubmitting) return;

    const userInput = inputValue.trim();
    setInputValue('');
    setIsSubmitting(true);

    try {
      await sendMessage(userInput);
    } catch (err: any) {
      console.error('Send error:', err.message || err);
    } finally {
      setIsSubmitting(false);
    }
  }, [inputValue, isSubmitting, sendMessage]);

  // Global keybindings
  useInput((input, key) => {
    if (activeModal) return;

    if (key.ctrl && input === 'p') {
      setActiveModal({ type: 'command-palette' });
    } else if (key.ctrl && input === 't') {
      setActiveModal({ type: 'thinking' });
    } else if (key.ctrl && input === 'l') {
      setActiveModal({ type: 'login' });
    } else if (key.ctrl && input === 'd') {
      setShowDebug((prev) => !prev);
    } else if (key.ctrl && input === 'e') {
      setActiveModal({ type: 'editor', initialValue: inputValue, onSave: async (val) => setInputValue(val) });
    } else if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  });

  const handleCommandSelect = useCallback((commandId: string) => {
    switch (commandId) {
      case 'clear':
        // Clear messages? Not directly supported; maybe we can reset session?
        setActiveModal(null);
        break;
      case 'quit':
        process.exit(0);
        break;
      default:
        setActiveModal(null);
    }
  }, []);

  const handleThinkingChange = useCallback((level: string) => {
    setActiveModal(null);
    // TODO: update runtime thinking level
  }, []);

  const handleLogin = useCallback(async (apiKey: string) => {
    // TODO: implement login
    setActiveModal(null);
  }, []);

  // Render active modal
  const renderModal = () => {
    if (!activeModal) return null;

    switch (activeModal.type) {
      case 'command-palette':
        return (
          <CommandPalette
            commands={[
              { id: 'clear', label: 'Clear Chat (not implemented)' },
              { id: 'quit', label: 'Quit', shortcut: 'Ctrl+C' },
            ]}
            onSelect={handleCommandSelect}
            onClose={() => setActiveModal(null)}
          />
        );
      case 'thinking':
        return (
          <ThinkingModal
            currentLevel={thinkingLevel}
            onChange={handleThinkingChange}
          />
        );
      case 'login':
        return (
          <LoginModal
            onLogin={handleLogin}
            onClose={() => setActiveModal(null)}
          />
        );
      case 'editor':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <Box flexDirection="column">
              <Text bold>Edit Input</Text>
              <InputBox
                value={activeModal.initialValue}
                onChange={setInputValue}
                onSubmit={async () => {
                  await activeModal.onSave(inputValue);
                  setActiveModal(null);
                }}
                multiline
                autoFocus
              />
            </Box>
          </Modal>
        );
      default:
        return null;
    }
  };

  const modelId = (runtime.session as any)?.model?.id || 'No model';

  return (
    <Box flexDirection="column" width="100%">
      <Header
        title="Picro Agent"
        status={status || 'Ready'}
        thinkingLevel={thinkingLevel}
        model={modelId}
      />
      <Box flexGrow={1} overflow="hidden" position="relative">
        <MessageList
          ref={messageListRef}
          messages={messages}
        />
        {showDebug && (
          <Box position="absolute" top={0} right={0}>
            <Text color="yellow">Debug</Text>
          </Box>
        )}
      </Box>
      <InputBox
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        placeholder="Type your message..."
        disabled={isSubmitting}
      />
      <Footer hints={['Ctrl+P: Commands', 'Ctrl+T: Thinking', 'Ctrl+E: Edit', 'Ctrl+D: Debug', 'Ctrl+C: Quit']} />
      {activeModal && renderModal()}
    </Box>
  );
};

export const InkApp: React.FC<{ runtime: AgentSessionRuntimeInterface }> = ({ runtime }) => {
  return (
    <ThemeProvider>
      <InkAppInner runtime={runtime} />
    </ThemeProvider>
  );
};

export const runInkApp = async (runtime: AgentSessionRuntimeInterface): Promise<void> => {
  const { waitUntilExit } = render(
    <InkApp runtime={runtime} />
  );
  await waitUntilExit();
};
