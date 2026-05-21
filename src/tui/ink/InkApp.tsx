/** @jsxImportSource react */
import React, { useCallback } from 'react';
import { render, Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../types/agent-session';
import type { Message } from './types';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { useRuntime } from './hooks/useRuntime';
import { Header } from './components/Header/Header';
import { MessageList } from './components/MessageList/MessageList';
import { InputBox } from './components/InputBox/InputBox';
import { Footer } from './components/Footer/Footer';
import { CommandPalette } from './modals/CommandPalette';
import { ThinkingModal } from './modals/ThinkingModal';
import { LoginModal } from './modals/LoginModal';
import { HelpModal } from './modals/HelpModal';
import { SessionSelectorModal } from './modals/SessionSelectorModal';
import { ConfirmationModal } from './modals/ConfirmationModal';
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
  | { type: 'session-selector' }
  | { type: 'confirmation'; title: string; message: string; onConfirm: () => Promise<void> | void; onCancel?: () => void }
  | null;

const InkAppInner: React.FC<InkAppInnerProps> = ({ runtime }) => {
  const { messages, status, thinkingLevel, sendMessage } = useRuntime(runtime);
  const { toggleTheme, isDark } = useTheme();
  const [inputValue, setInputValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeModal, setActiveModal] = React.useState<ModalState>(null);
  const [showDebug, setShowDebug] = React.useState(false);
  const messageListRef = React.useRef<{ scrollToBottom: () => void } | null>(null);
  const [toasts, setToasts] = React.useState<Array<{ id: number; message: string; type: 'info' | 'success' | 'error' }>>([]);
  const toastIdRef = React.useRef(0);

  // Close command palette if slash removed
  React.useEffect(() => {
    if (activeModal?.type === 'command-palette' && activeModal.isSlash && !inputValue.startsWith('/')) {
      setActiveModal(null);
    }
  }, [inputValue, activeModal]);

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000); // auto-dismiss after 4s
  }, []);

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
    } else if (key.ctrl && key.shift && input === 't') {
      // Toggle theme with Ctrl+Shift+T
      toggleTheme();
      // Persist
      try {
        runtime.settings?.set('theme', isDark ? 'light' : 'dark');
        runtime.settings?.save?.();
      } catch {
        // ignore
      }
    } else if (key.ctrl && input === 'l') {
      setActiveModal({ type: 'login' });
    } else if (key.ctrl && input === 'r') {
      setActiveModal({ type: 'session-selector' });
    } else if (key.ctrl && input === 'd') {
      setShowDebug((prev) => !prev);
    } else if (key.ctrl && input === 'e') {
      setActiveModal({ type: 'editor', initialValue: inputValue, onSave: async (val) => setInputValue(val) });
    } else if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  });

  const handleCommandSelect = useCallback(async (commandId: string, slashArgs?: string) => {
    setActiveModal(null);
    setInputValue(''); // Clear input

    // Extract args after command name if present
    let args = '';
    if (slashArgs) {
      const withoutSlash = slashArgs.slice(1).trim(); // remove leading '/'
      const parts = withoutSlash.split(' ');
      if (parts[0] === commandId) {
        args = parts.slice(1).join(' ').trim();
      }
    }

    switch (commandId) {
      case 'clear':
        runtime.newSession().catch(console.error);
        addToast('Started new session', 'info');
        break;
      case 'quit':
        process.exit(0);
        break;
      case 'thinking':
        if (args && ['off','minimal','low','medium','high','xhigh'].includes(args)) {
          runtime.setThinkingLevel(args as any);
          addToast(`Thinking level set to ${args}`, 'success');
        } else {
          setActiveModal({ type: 'thinking' });
        }
        break;
      case 'login':
        setActiveModal({ type: 'login' });
        break;
      case 'help':
        setActiveModal({ type: 'help' });
        break;
      case 'new':
        runtime.newSession().catch(console.error);
        addToast('New session created', 'info');
        break;
      case 'copy':
        // If args contain 'all', copy full conversation; else copy last assistant
        if (args === 'all') {
          const conversation = messages.map(m => {
            const role = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'Tool';
            return `${role}: ${m.content}`;
          }).join('\n\n');
          try {
            await runtime.copyToClipboard(conversation);
            addToast('Copied full conversation to clipboard', 'success');
          } catch (err) {
            addToast('Copy failed', 'error');
          }
        } else {
          const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
          if (lastAssistant) {
            try {
              await runtime.copyToClipboard(lastAssistant.content);
              addToast('Copied last assistant message', 'success');
            } catch (err) {
              addToast('Copy failed', 'error');
            }
          } else {
            addToast('No assistant message to copy', 'info');
          }
        }
        break;
      case 'resume':
        setActiveModal({ type: 'session-selector' });
        break;
      case 'new':
        // Show confirmation before creating new session
        setActiveModal({
          type: 'confirmation',
          title: 'New Session',
          message: 'Create a new session? Current session will be saved.',
          onConfirm: async () => {
            try {
              await runtime.newSession();
              addToast('New session created', 'success');
            } catch (err) {
              addToast('Failed to create session', 'error');
            }
          },
          onCancel: () => {
            // no-op
          },
        });
        break;
      case 'fork':
        // Fork requires a message ID – prompt for now
        addToast('Fork: enter message ID (not yet implemented)', 'info');
        break;
      default:
        // Other commands not yet implemented
        break;
    }
  }, [runtime, messages, addToast]);

  const handleThinkingChange = useCallback((level: string) => {
    setActiveModal(null);
    runtime.setThinkingLevel(level as any);
  }, [runtime]);

  const handleLogin = useCallback(async (apiKey: string) => {
    const defaultProvider = runtime.settings?.getDefaultProvider() || 'openai';
    await runtime.authStorage.setApiKey(defaultProvider, apiKey);
    addToast('Logged in successfully', 'success');
    setActiveModal(null);
  }, [runtime, addToast]);

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
              onSelect={(id) => handleCommandSelect(id, activeModal.filter)}
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
      case 'session-selector':
        return (
          <SessionSelectorModal runtime={runtime} onClose={() => setActiveModal(null)} />
        );
      case 'confirmation':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <ConfirmationModal
              title={activeModal.title}
              message={activeModal.message}
              onConfirm={async () => {
                await activeModal.onConfirm();
                setActiveModal(null);
              }}
              onCancel={() => {
                activeModal.onCancel?.();
                setActiveModal(null);
              }}
            />
          </Modal>
        );
      default:
        return null;
    }
  };

  const modelId = (runtime.session as any)?.model?.id || 'No model';
  const themeLabel = isDark ? 'dark' : 'light';

  return (
    <Box flexDirection="column" width="100%" position="relative">
      <Header
        title="Picro Agent"
        status={status || 'Ready'}
        thinkingLevel={thinkingLevel}
        model={modelId}
        theme={themeLabel}
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
      <Footer hints={[
        'Ctrl+P: Commands',
        'Ctrl+T: Thinking',
        'Ctrl+Shift+T: Toggle Theme',
        'Ctrl+R: Resume Session',
        'Ctrl+E: Edit',
        'Ctrl+D: Debug',
        'Ctrl+C: Quit'
      ]} />
      {activeModal && renderModal()}
      {/* Toast notifications */}
      <Box flexDirection="column" position="absolute" top={0} right={0}>
        {toasts.map(toast => (
          <Box key={toast.id} borderStyle="round" paddingX={1} margin={1}>
            <Text color={toast.type === 'error' ? 'red' : toast.type === 'success' ? 'green' : 'cyan'}>
              {toast.message}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const InkApp: React.FC<{ runtime: AgentSessionRuntimeInterface }> = ({ runtime }) => {
  // Determine initial theme from settings
  let initialMode: 'dark' | 'light' = 'dark';
  try {
    const themeSetting = runtime.settings?.get?.('theme');
    if (themeSetting === 'light') initialMode = 'light';
  } catch {
    // default dark
  }

  return (
    <ThemeProvider initialMode={initialMode}>
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
