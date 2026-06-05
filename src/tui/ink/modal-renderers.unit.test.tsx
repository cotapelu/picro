/** @jsxImportSource react */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModalRenderers } from './modal-renderers.js';
import { Modal } from './modals/Modal.js';
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
import { BashOutputModal } from './modals/BashOutputModal.js';
import { InputModal } from './modals/InputModal.js';
import { SelectModal } from './modals/SelectModal.js';

const mockOnSelectCommand = vi.fn();
const mockOnTreeSelect = vi.fn();
const mockOnClose = vi.fn();

function getProps(activeModal: any, runtimeOverrides: any = {}) {
  const defaultRuntime: any = {
    settings: { getDefaultProvider: () => 'openai' },
    authStorage: { setApiKey: vi.fn() },
    thinkingLevel: 'medium',
    setThinkingLevel: vi.fn(),
    // For modals that need session or resourceLoader, provide minimal mocks
    session: {},
    // Provide default empty resourceLoader; can override
    _resourceLoader: { getSkills: () => ({ skills: [] }), getPromptTemplates: () => [] },
    _extensionRunner: { getCommands: () => [] },
    ...runtimeOverrides,
  };
  return {
    activeModal,
    runtime: defaultRuntime,
    onSelectCommand: mockOnSelectCommand,
    onTreeSelect: mockOnTreeSelect,
    onClose: mockOnClose,
  };
}

describe('ModalRenderers unit', () => {
  it('renders null when activeModal is null', () => {
    const element = ModalRenderers(getProps(null));
    expect(element).toBeNull();
  });

  const simpleCases: Array<{ name: string; modal: any; childType: any }> = [
    { name: 'thinking', modal: { type: 'thinking' }, childType: ThinkingModal },
    { name: 'login', modal: { type: 'login' }, childType: LoginModal },
    { name: 'session-selector', modal: { type: 'session-selector' }, childType: SessionSelectorModal },
    { name: 'confirmation', modal: { type: 'confirmation', title: 'T', message: 'M', onConfirm: vi.fn() }, childType: ConfirmationModal },
    { name: 'settings', modal: { type: 'settings' }, childType: SettingsSelectorModal },
    { name: 'model-selector', modal: { type: 'model-selector' }, childType: ModelSelectorModal },
    { name: 'scoped-models', modal: { type: 'scoped-models' }, childType: ScopedModelsSelectorModal },
    { name: 'user-message-selector', modal: { type: 'user-message-selector' }, childType: UserMessageSelectorModal },
    { name: 'session-info', modal: { type: 'session-info' }, childType: SessionInfoModal },
    { name: 'changelog', modal: { type: 'changelog' }, childType: ChangelogModal },
    { name: 'hotkeys', modal: { type: 'hotkeys' }, childType: HotkeysModal },
    { name: 'tree-selector', modal: { type: 'tree-selector' }, childType: TreeSelectorModal },
    { name: 'bash-output', modal: { type: 'bash-output', command: 'ls', output: 'out' }, childType: BashOutputModal },
    { name: 'input', modal: { type: 'input', title: 'I', onSubmit: vi.fn() }, childType: InputModal },
    { name: 'select', modal: { type: 'select', title: 'S', options: ['a'], onSelect: vi.fn() }, childType: SelectModal },
  ];

  for (const c of simpleCases) {
    it(`renders ${c.name} modal`, () => {
      const element = ModalRenderers(getProps(c.modal));
      expect(element).not.toBeNull();
      expect(element.type).toBe(Modal);
      const child = element.props.children;
      expect(child.type).toBe(c.childType);
    });
  }

  it('renders command-palette modal with commands', () => {
    // Provide runtime with necessary mocks
    const runtime = {
      session: {
        _extensionRunner: { getCommands: () => [] },
        _resourceLoader: { getSkills: () => ({ skills: [] }), getPromptTemplates: () => [] },
      },
    };
    const element = ModalRenderers(getProps({ type: 'command-palette', filter: '/', isSlash: false }, runtime));
    expect(element).not.toBeNull();
    expect(element.type).toBe(Modal);
    const child = element.props.children;
    expect(child.type).toBe(CommandPalette);
  });

  it('renders help modal', () => {
    const element = ModalRenderers(getProps({ type: 'help' }));
    expect(element).not.toBeNull();
    expect(element.type).toBe(Modal);
    const child = element.props.children;
    expect(child.type).toBe(HelpModal);
  });

  it('renders stats modal', () => {
    const stats = { sampleCount: 1, timeSpanMS: 1, avgCpuUserMS: 0, avgCpuSystemMS: 0, avgRSSMB: 0, avgHeapUsedMB: 0, peakRSSMB: 0, peakHeapUsedMB: 0 };
    const element = ModalRenderers(getProps({ type: 'stats', stats }));
    expect(element).not.toBeNull();
    expect(element.type).toBe(Modal);
    expect(React.isValidElement(element.props.children)).toBe(true);
  });

  it('renders armin modal', () => {
    const element = ModalRenderers(getProps({ type: 'armin' }));
    expect(element).not.toBeNull();
    expect(element.type).toBe(Modal);
    expect(React.isValidElement(element.props.children)).toBe(true);
  });

  it('renders earendil modal', () => {
    const element = ModalRenderers(getProps({ type: 'earendil' }));
    expect(element).not.toBeNull();
    expect(element.type).toBe(Modal);
    expect(React.isValidElement(element.props.children)).toBe(true);
  });

  it('renders editor modal', () => {
    const element = ModalRenderers(getProps({ type: 'editor', initialValue: 'val', onSave: async () => {} }));
    expect(element).not.toBeNull();
    expect(element.type).toBe(Modal);
    expect(React.isValidElement(element.props.children)).toBe(true);
  });

  it('renders custom modal with factory', () => {
    const factory = () => React.createElement('div', null, 'custom');
    const element = ModalRenderers(getProps({ type: 'custom', factory }));
    expect(element).not.toBeNull();
    expect(element.type).toBe(Modal);
    expect(element.props.children.type).toBe('div');
  });

  it('returns null for unknown modal type (default)', () => {
    const element = ModalRenderers(getProps({ type: 'unknown' } as any));
    expect(element).toBeNull();
  });
});
