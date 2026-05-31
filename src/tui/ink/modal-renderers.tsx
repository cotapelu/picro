/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import type { AgentSessionRuntimeInterface } from '../runtime.js';
import { BUILTIN_SLASH_COMMANDS } from '../../runtime/slash-commands.js';
import { CommandPalette } from './modals/CommandPalette.js';
import { ThinkingModal } from './modals/ThinkingModal.js';
import { LoginModal } from './modals/LoginModal.js';
import { HelpModal } from './modals/HelpModal.js';
import { SessionSelectorModal } from './modals/SessionSelectorModal.js';
import { ConfirmationModal } from './modals/ConfirmationModal.js';
import { SettingsSelectorModal } from './modals/SettingsSelectorModal.js';
import { ModelSelectorModal } from './modals/ModelSelectorModal.js';
import { ScopedModelsSelectorModal } from './modals/ScopedModelsSelectorModal.js';
import { UserMessageSelectorModal } from './modals/UserMessageSelectorModal.js';
import { SessionInfoModal } from './modals/SessionInfoModal.js';
import { ChangelogModal } from './modals/ChangelogModal.js';
import { HotkeysModal } from './modals/HotkeysModal.js';
import { TreeSelectorModal } from './modals/TreeSelectorModal.js';
import { TreeSummarizationModal } from './modals/TreeSummarizationModal.js';
import { BashOutputModal } from './modals/BashOutputModal.js';
import { InputModal } from './modals/InputModal.js';
import { SelectModal } from './modals/SelectModal.js';
import { Modal } from './modals/Modal.js';

export type ModalState =
  | { type: 'command-palette'; filter?: string; isSlash?: boolean }
  | { type: 'thinking' }
  | { type: 'login' }
  | { type: 'editor'; initialValue: string; onSave: (value: string) => Promise<void> }
  | { type: 'help' }
  | { type: 'session-selector' }
  | { type: 'confirmation'; title: string; message: string; onConfirm: () => Promise<void> | void; onCancel?: () => void }
  | { type: 'settings' }
  | { type: 'model-selector' }
  | { type: 'scoped-models' }
  | { type: 'user-message-selector' }
  | { type: 'session-info' }
  | { type: 'changelog' }
  | { type: 'hotkeys' }
  | { type: 'tree-selector' }
  | { type: 'tree-summarization'; branchId: string }
  | { type: 'bash-output'; command: string; output: string; error?: boolean }
  | { type: 'stats'; stats: any }
  | { type: 'armin' }
  | { type: 'earendil' }
  | { type: 'custom' }
  | { type: 'input'; title: string; placeholder?: string; onSubmit: (value: string) => void; onCancel?: () => void }
  | { type: 'select'; title: string; options: readonly string[]; onSelect: (option: string) => void; onCancel?: () => void }
  | null;

interface ModalRenderersProps {
  activeModal: ModalState;
  runtime: AgentSessionRuntimeInterface;
  onSelectCommand: (commandId: string, slashArgs?: string) => void;
  onTreeSelect: (branchId: string) => void;
  onClose: () => void;
}

export const ModalRenderers: React.FC<ModalRenderersProps> = ({
  activeModal,
  runtime,
  onSelectCommand,
  onTreeSelect,
  onClose,
}) => {
  if (!activeModal) return null;

  switch (activeModal.type) {
    case 'command-palette':
      const session = (runtime as any).session;
      const builtinCmds = BUILTIN_SLASH_COMMANDS;
      const extensionCommands: any[] = session._extensionRunner?.getCommands?.() || [];
      const skills: any[] = session._resourceLoader?.getSkills?.()?.skills || [];
      const promptTemplates: any[] = session._resourceLoader?.getPromptTemplates?.() || [];
      const allCommands = [
        ...builtinCmds.map(c => ({ id: c.name, label: `/${c.name}`, description: c.description, source: 'builtin' })),
        ...extensionCommands.map(c => ({ id: c.invocationName, label: c.invocationName.startsWith('/') ? c.invocationName : `/${c.invocationName}`, description: c.description, source: 'extension' })),
        ...skills.map(s => ({ id: `skill:${s.name}`, label: `skill:${s.name}`, description: s.description, source: 'skill' })),
        ...promptTemplates.map(t => ({ id: t.name, label: `template:${t.name}`, description: t.description, source: 'template' })),
      ];
      const filter = activeModal.filter || '';
      const search = filter.toLowerCase().replace(/^\/+/g, '');
      const filtered = allCommands.filter(cmd =>
        cmd.label.toLowerCase().includes(search) ||
        (cmd.description && cmd.description.toLowerCase().includes(search))
      );
      return (
        <Modal onClose={onClose}>
          <CommandPalette
            commands={filtered}
            onSelect={(id) => onSelectCommand(id, filter)}
            onClose={onClose}
          />
        </Modal>
      );

    case 'thinking':
      return (
        <Modal onClose={onClose}>
          <ThinkingModal
            currentLevel={runtime.thinkingLevel}
            onChange={(level) => {
              runtime.setThinkingLevel(level as any);
              onClose();
            }}
          />
        </Modal>
      );

    case 'login':
      return (
        <Modal onClose={onClose}>
          <LoginModal
            onLogin={async (apiKey: string) => {
              const defaultProvider = runtime.settings?.getDefaultProvider() || 'openai';
              await runtime.authStorage.setApiKey(defaultProvider, apiKey);
              onClose();
            }}
            onClose={onClose}
          />
        </Modal>
      );

    case 'session-selector':
      return (
        <Modal onClose={onClose}>
          <SessionSelectorModal runtime={runtime} onClose={onClose} />
        </Modal>
      );

    case 'settings':
      return (
        <Modal onClose={onClose}>
          <SettingsSelectorModal runtime={runtime} onClose={onClose} />
        </Modal>
      );

    case 'model-selector':
      return (
        <Modal onClose={onClose}>
          <ModelSelectorModal runtime={runtime} onClose={onClose} />
        </Modal>
      );

    case 'scoped-models':
      return (
        <Modal onClose={onClose}>
          <ScopedModelsSelectorModal runtime={runtime} onClose={onClose} />
        </Modal>
      );

    case 'user-message-selector':
      return (
        <Modal onClose={onClose}>
          <UserMessageSelectorModal runtime={runtime} onClose={onClose} />
        </Modal>
      );

    case 'session-info':
      return (
        <Modal onClose={onClose}>
          <SessionInfoModal runtime={runtime} onClose={onClose} />
        </Modal>
      );

    case 'changelog':
      return (
        <Modal onClose={onClose}>
          <ChangelogModal onClose={onClose} />
        </Modal>
      );

    case 'hotkeys':
      return (
        <Modal onClose={onClose}>
          <HotkeysModal onClose={onClose} />
        </Modal>
      );

    case 'tree-selector':
      return (
        <Modal onClose={onClose}>
          <TreeSelectorModal
            runtime={runtime}
            onClose={onClose}
            onSelect={onTreeSelect}
          />
        </Modal>
      );

    case 'tree-summarization':
      return (
        <Modal onClose={onClose}>
          <SelectModal
            title="Summarization Options"
            options={['No summary', 'Summarize with default', 'Summarize with custom prompt...']}
            onSelect={async (option) => {
              onClose();
              if (!activeModal.branchId) return;
              if (option === 'No summary') {
                await (runtime as any).navigateTree(activeModal.branchId, { summarize: false });
              } else if (option === 'Summarize with default') {
                await (runtime as any).navigateTree(activeModal.branchId, { summarize: true });
              } else if (option === 'Summarize with custom prompt...') {
                // Open editor for custom instructions - handled by caller
                onTreeSelect(activeModal.branchId); // Signal to open editor
              }
            }}
            onCancel={onClose}
          />
        </Modal>
      );

    case 'bash-output':
      return (
        <Modal onClose={onClose}>
          <BashOutputModal
            command={activeModal.command}
            output={activeModal.output}
            error={activeModal.error}
            onClose={onClose}
          />
        </Modal>
      );

    case 'confirmation':
      return (
        <Modal onClose={onClose}>
          <ConfirmationModal
            title={activeModal.title}
            message={activeModal.message}
            onConfirm={async () => {
              await activeModal.onConfirm();
              onClose();
            }}
            onCancel={() => {
              activeModal.onCancel?.();
              onClose();
            }}
          />
        </Modal>
      );

    case 'editor':
      return (
        <Modal onClose={onClose}>
          <Box flexDirection="column">
            <Text bold>Edit Input</Text>
            <InputBox
              value={activeModal.initialValue}
              onChange={() => {}}
              onSubmit={async (val) => {
                await activeModal.onSave(val);
                onClose();
              }}
              multiline
              autoFocus
            />
          </Box>
        </Modal>
      );

    case 'input':
      return (
        <Modal onClose={onClose}>
          <InputModal
            title={activeModal.title}
            placeholder={activeModal.placeholder}
            onSubmit={(value) => {
              activeModal.onSubmit(value);
              onClose();
            }}
            onCancel={() => {
              activeModal.onCancel?.();
              onClose();
            }}
          />
        </Modal>
      );

    case 'select':
      return (
        <Modal onClose={onClose}>
          <SelectModal
            title={activeModal.title}
            options={activeModal.options}
            onSelect={(option) => {
              activeModal.onSelect(option);
              onClose();
            }}
            onCancel={() => {
              activeModal.onCancel?.();
              onClose();
            }}
          />
        </Modal>
      );

    case 'stats':
      return (
        <Modal onClose={onClose}>
          <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
            <Text bold color="green">Performance Metrics</Text>
            <Box flexDirection="column" marginTop={1}>
              <Text>Samples: {activeModal.stats.sampleCount}</Text>
              <Text>Time Span: {activeModal.stats.timeSpanMS.toFixed(0)}ms</Text>
              <Text>Avg CPU User: {activeModal.stats.avgCpuUserMS.toFixed(2)}ms</Text>
              <Text>Avg CPU System: {activeModal.stats.avgCpuSystemMS.toFixed(2)}ms</Text>
              <Text>Avg RSS: {activeModal.stats.avgRSSMB.toFixed(2)} MB</Text>
              <Text>Avg Heap Used: {activeModal.stats.avgHeapUsedMB.toFixed(2)} MB</Text>
              <Text>Peak RSS: {activeModal.stats.peakRSSMB.toFixed(2)} MB</Text>
              <Text>Peak Heap Used: {activeModal.stats.peakHeapUsedMB.toFixed(2)} MB</Text>
            </Box>
          </Box>
        </Modal>
      );

    case 'armin':
      return (
        <Modal onClose={onClose}>
          <Box justifyContent="center" alignItems="center" flexDirection="column">
            <Text>HI! I'M ARMIN!</Text>
          </Box>
        </Modal>
      );

    case 'earendil':
      return (
        <Modal onClose={onClose}>
          <Box justifyContent="center" alignItems="center" flexDirection="column">
            <Text bold color="yellow">DEMENTED ELVES HAVE EMERGED</Text>
          </Box>
        </Modal>
      );

    default:
      return null;
  }
};

// Need to import InputBox for editor modal
function InputBox(props: any) {
  // Placeholder - inline the component or import properly
  return <Box>Editor: {props.initialValue}</Box>;
}
