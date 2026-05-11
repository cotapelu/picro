// SPDX-License-Identifier: Apache-2.0
/**
 * Type-level tests for ExtensionUIContext interface
 */

import { describe, it, expect } from 'vitest';
import type { ExtensionUIContext, Theme } from './extension-ui-context';

// Minimal mock implementation satisfying the interface
const mockContext: ExtensionUIContext = {
  select: async () => undefined,
  confirm: async () => false,
  input: async () => undefined,
  notify: () => {},
  onTerminalInput: () => {},
  setStatus: () => {},
  setWorkingMessage: () => {},
  setWorkingIndicator: () => {},
  setHiddenThinkingLabel: () => {},
  setWidget: () => {},
  setFooter: () => {},
  setHeader: () => {},
  setTitle: () => {},
  custom: async () => {},
  pasteToEditor: () => {},
  setEditorText: () => {},
  getEditorText: () => '',
  editor: async () => undefined,
  addAutocompleteProvider: () => {},
  setEditorComponent: () => {},
  get theme(): Theme {
    return {} as Theme;
  },
  getAllThemes: () => [],
  getTheme: () => undefined,
  setTheme: () => ({ success: true }),
  getToolsExpanded: () => false,
  setToolsExpanded: () => {},
};

describe('ExtensionUIContext', () => {
  it('should have select method', () => {
    expect(typeof mockContext.select).toBe('function');
  });

  it('should have confirm method', () => {
    expect(typeof mockContext.confirm).toBe('function');
  });

  it('should have input method', () => {
    expect(typeof mockContext.input).toBe('function');
  });

  it('should have notify method', () => {
    expect(typeof mockContext.notify).toBe('function');
  });

  it('should have onTerminalInput method', () => {
    expect(typeof mockContext.onTerminalInput).toBe('function');
  });

  it('should have setStatus method', () => {
    expect(typeof mockContext.setStatus).toBe('function');
  });

  it('should have setWorkingMessage method', () => {
    expect(typeof mockContext.setWorkingMessage).toBe('function');
  });

  it('should have setWorkingIndicator method', () => {
    expect(typeof mockContext.setWorkingIndicator).toBe('function');
  });

  it('should have setHiddenThinkingLabel method', () => {
    expect(typeof mockContext.setHiddenThinkingLabel).toBe('function');
  });

  it('should have setWidget method', () => {
    expect(typeof mockContext.setWidget).toBe('function');
  });

  it('should have setFooter method', () => {
    expect(typeof mockContext.setFooter).toBe('function');
  });

  it('should have setHeader method', () => {
    expect(typeof mockContext.setHeader).toBe('function');
  });

  it('should have setTitle method', () => {
    expect(typeof mockContext.setTitle).toBe('function');
  });

  it('should have custom method', () => {
    expect(typeof mockContext.custom).toBe('function');
  });

  it('should have pasteToEditor method', () => {
    expect(typeof mockContext.pasteToEditor).toBe('function');
  });

  it('should have setEditorText method', () => {
    expect(typeof mockContext.setEditorText).toBe('function');
  });

  it('should have getEditorText method', () => {
    expect(typeof mockContext.getEditorText).toBe('function');
  });

  it('should have editor method', () => {
    expect(typeof mockContext.editor).toBe('function');
  });

  it('should have addAutocompleteProvider method', () => {
    expect(typeof mockContext.addAutocompleteProvider).toBe('function');
  });

  it('should have setEditorComponent method', () => {
    expect(typeof mockContext.setEditorComponent).toBe('function');
  });

  it('should have theme getter', () => {
    expect(mockContext.theme).toBeDefined();
  });

  it('should have getAllThemes method', () => {
    expect(typeof mockContext.getAllThemes).toBe('function');
  });

  it('should have getTheme method', () => {
    expect(typeof mockContext.getTheme).toBe('function');
  });

  it('should have setTheme method', () => {
    expect(typeof mockContext.setTheme).toBe('function');
  });

  it('should have getToolsExpanded method', () => {
    expect(typeof mockContext.getToolsExpanded).toBe('function');
  });

  it('should have setToolsExpanded method', () => {
    expect(typeof mockContext.setToolsExpanded).toBe('function');
  });
});