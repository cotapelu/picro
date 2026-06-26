/** @jsxImportSource react */
import React from 'react';
import { render, Box, Text } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';
import { ThemeProvider, useTheme } from './hooks/useTheme.js';
import { useInkAppState } from './hooks/useInkAppState.js';
import { ErrorBoundary, useGlobalErrorHandler } from './ErrorBoundary.js';
import { Header } from './components/Header/Header.js';
import { MessageList } from './components/MessageList/MessageList.js';
import { InputBox } from './components/InputBox/InputBox.js';
import { Footer } from './components/Footer/Footer.js';
import { ModalRenderers } from './modal-renderers.js';

interface InkAppInnerProps {
  runtime: AgentSessionRuntimeInterface;
  state: ReturnType<typeof useInkAppState>;
}

const InkAppInner: React.FC<InkAppInnerProps> = ({ runtime, state }) => {
  const {
    messages,
    status,
    isStreaming,
    isCompacting,
    retryAttempt,
    toolOutputExpanded,
    hideThinkingBlock,
    hiddenThinkingLabel,
    steeringMessages,
    followUpMessages,
    currentModel,
    thinkingLevel,
    // UI state
    workingVisible,
    workingMessage,
    retryCountdown,
    retryMaxAttempts,
    displayStatus,
    activeModal,
    setActiveModal,
    toasts,
    inputValue,
    setInputValue,
    isSubmitting,
    messageListRef,
    extensionWidgetsAbove,
    extensionWidgetsBelow,
    customEditor,
    customHeader,
    customFooter,
    customOverlay,
    // Handlers
    handleSubmit,
    handleSelectCommand,
    handleDequeue,
    onEscape,
    onCommandPalette,
    onThinking,
    onToolOutputToggle,
    onThinkingBlockToggle,
    onLoginTrigger,
    onSessionSelector,
    onDebugTrigger,
    onEditorTrigger,
    onPasteTrigger,
    onThemeToggle,
    onInterrupt,
    // Helpers
    footerProvider,
    addToast,
  } = state;

  const showImages = runtime.session.settings?.get?.('terminal.showImages') ?? true;
  const imageWidthCells = runtime.session.settings?.get?.('terminal.imageWidthCells') ?? 60;
  const modelId = currentModel?.id || (runtime.session as any)?.model?.id || 'No model';
  const { isDark } = useTheme();

  // Overlay
  if (customOverlay) {
    const OverlayComponent = customOverlay.factory;
    return (
      <Box flexDirection="column" width="100%" height="100%">
        <Box flexGrow={1}>
          <OverlayComponent />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Extension widgets above */}
      {extensionWidgetsAbove.size > 0 && (
        <Box flexDirection="column">
          {Array.from(extensionWidgetsAbove.entries()).map(([key, node]) => (
            <Box key={key}>{node}</Box>
          ))}
        </Box>
      )}
      {customHeader || (
        <Header
          modelId={modelId}
          thinkingLevel={thinkingLevel}
          isDark={isDark}
          tokenUsage={footerProvider.getTokenUsage()}
          onThemeToggle={onThemeToggle}
          onCommandPalette={onCommandPalette}
          onThinking={onThinking}
          onSettings={() => setActiveModal({ type: 'settings' })}
        />
      )}
      {/* Main content area */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        <MessageList
          ref={messageListRef}
          messages={messages}
          hideThinkingBlock={hideThinkingBlock}
          hiddenThinkingLabel={hiddenThinkingLabel}
          showImages={showImages}
          imageWidthCells={imageWidthCells}
        />
        {/* Extension widgets below message list but above input */}
        {extensionWidgetsBelow.size > 0 && (
          <Box flexDirection="column" paddingX={1} borderTop="thin">
            {Array.from(extensionWidgetsBelow.entries()).map(([key, node]) => (
              <Box key={key}>{node}</Box>
          ))}
          </Box>
        )}
        {/* Status line for compaction/retry/working */}
        {(isCompacting || retryAttempt > 0 || workingVisible) && (
          <Box paddingX={1}>
            <Text color={workingVisible ? 'cyan' : isCompacting ? 'yellow' : 'orange'}>
              {displayStatus}
            </Text>
          </Box>
        )}
        <InputBox
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          placeholder="Type your message..."
          disabled={isSubmitting || activeModal !== null}
          onSlashCommand={onCommandPalette}
          onTab={onCommandPalette}
          cwd={runtime.cwd}
          extensionShortcuts={state.extensionShortcutsRef}
          onCommandPalette={onCommandPalette}
          onThinking={onThinking}
          onThemeToggle={onThemeToggle}
          onToolOutputToggle={onToolOutputToggle}
          onThinkingBlockToggle={onThinkingBlockToggle}
          onLogin={onLoginTrigger}
          onSessionSelector={onSessionSelector}
          onDebug={onDebugTrigger}
          onEditor={onEditorTrigger}
          onPaste={onPasteTrigger}
          onInterrupt={onInterrupt}
          onEscape={onEscape}
          onPathComplete={state.onAutocomplete} // autocomplete uses same handler as path
          onAutocomplete={state.onAutocomplete}
        />
      </Box>
      {customFooter || (
        <Footer
          provider={footerProvider}
          hints={[
            'Ctrl+P: Commands',
            'Ctrl+T: Thinking',
            'Ctrl+Shift+T: Toggle Theme',
            'Ctrl+R: Resume Session',
            'Ctrl+Alt+E: Edit',
            'Ctrl+D: Debug',
            'Ctrl+C: Quit'
          ]}
        />
      )}
      {activeModal && (
        <ModalRenderers
          activeModal={activeModal}
          runtime={runtime}
          onSelectCommand={handleSelectCommand}
          onTreeSelect={state.handleTreeSelect}
          onClose={() => setActiveModal(null)}
          setActiveModal={setActiveModal}
          addToast={addToast}
          onForkResult={(text) => setInputValue(text)}
        />
      )}
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
  // Set up global error handling for unhandled errors and rejections
  useGlobalErrorHandler();

  const state = useInkAppState(runtime);

  // Determine initial theme from settings
  let initialMode: 'dark' | 'light' = 'dark';
  try {
    const themeSetting = runtime.settings?.get?.('theme');
    if (themeSetting === 'light') initialMode = 'light';
  } catch {
    // default dark
  }

  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      console.error('App error:', error, errorInfo);
      try {
        track('agent.error', {
          message: error?.message ?? String(error),
          stack: error?.stack,
          componentStack: errorInfo?.componentStack,
        });
      } catch (e) {
        // ignore telemetry errors
      }
    }}>
      <ThemeProvider initialMode={initialMode}>
        <InkAppInner runtime={runtime} state={state} />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export const runInkApp = async (runtime: AgentSessionRuntimeInterface): Promise<void> => {
  const { waitUntilExit } = render(
    <InkApp runtime={runtime} />
  );
  await waitUntilExit();
};
