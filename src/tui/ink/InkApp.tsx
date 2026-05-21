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
import { HelpModal } from './modals/HelpModal';
import { Modal } from './modals/Modal';
import { BUILTIN_SLASH_COMMANDS } from '../../runtime/slash-commands';

interface InkAppInnerProps {
  runtime: AgentSessionRuntimeInterface;
}

type ModalState =
  | { type: 'command-palette'; filter?: string; isSlash?: boolean }
  | { type: 'thinking' }
  | { type: 'login' }
  | { type: 'editor'; initialValue: string; onSave: (value: string) => Promise<void> }
  | { type: 'help' }
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

  const handleCommandSelect = useCallback(async (commandId: string) => {
    setActiveModal(null);
    setInputValue(''); // Clear input

    switch (commandId) {
      case 'clear':
        runtime.newSession().catch(console.error);
        break;
      case 'quit':
        process.exit(0);
        break;
      case 'thinking':
        setActiveModal({ type: 'thinking' });
        break;
      case 'login':
        setActiveModal({ type: 'login' });
        break;
      case 'help':
        setActiveModal({ type: 'help' });
        break;
      case 'new':
        runtime.newSession().catch(console.error);
        break;
      case 'copy':
        // Copy last assistant message to clipboard
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistant) {
          try {
            await runtime.copyToClipboard(lastAssistant.content);
          } catch (err) {
            console.error('Copy failed:', err);
          }
        }
        break;
      default:
        // Other commands not yet implemented
        break;
    }
  }, [runtime, messages]);

  const handleThinkingChange = useCallback((level: string) => {
    setActiveModal(null);
    runtime.setThinkingLevel(level as any);
  }, [runtime]);

  const handleLogin = useCallback(async (apiKey: string) => {
    const defaultProvider = runtime.settings?.getDefaultProvider() || 'openai';
    await runtime.authStorage.setApiKey(defaultProvider, apiKey);
    setActiveModal(null);
  }, [runtime]);

  // Render active modal
  const renderModal = () => {
    if (!activeModal) return null;

    switch (activeModal.type) {
      case 'command-palette':
        const commands = BUILTIN_SLASH_COMMANDS.filter(cmd => {
          const filter = activeModal.filter || '';
          const search = filter.slice(1).toLowerCase(); // remove leading '/'
          return cmd.name.toLowerCase().includes(search) ||
                 cmd.description.toLowerCase().includes(search);
        }).map(cmd => ({
          id: cmd.name,
          label: `/${cmd.name}`,
          description: cmd.description,
        }));
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <CommandPalette
              commands={commands}
              onSelect={handleCommandSelect}
              onClose={() => setActiveModal(null)}
            />
          </Modal>
        );
      case 'thinking':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <ThinkingModal
              currentLevel={thinkingLevel}
              onChange={handleThinkingChange}
            />
          </Modal>
        );
      case 'login':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <LoginModal
              onLogin={handleLogin}
              onClose={() => setActiveModal(null)}
            />
          </Modal>
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
      case 'help':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <HelpModal onClose={() => setActiveModal(null)} />
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
        onSlashCommand={(prefix) => {
          // Open command palette with filter
          setActiveModal({ type: 'command-palette', filter: prefix, isSlash: true });
        }}
        onTab={() => {
          // Autocomplete: open command palette with all commands
          setActiveModal({ type: 'command-palette', filter: '', isSlash: false });
        }}
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
