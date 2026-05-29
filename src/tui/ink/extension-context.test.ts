import { describe, it, expect, vi } from 'vitest';
import { createExtensionUIContext } from './extension-context';

describe('createExtensionUIContext', () => {
  it('should create context with stub theme', () => {
    const inkApp = {};
    const ctx = createExtensionUIContext(inkApp);
    expect(ctx.theme).toEqual({ dim: '', accent: '', error: '', success: '', warning: '', border: '' });
  });

  it('should have select return first option by default', async () => {
    const inkApp = {};
    const ctx = createExtensionUIContext(inkApp);
    const result = await ctx.select('Title', ['opt1', 'opt2']);
    expect(result).toBe('opt1');
  });

  it('should have confirm return true by default', async () => {
    const inkApp = {};
    const ctx = createExtensionUIContext(inkApp);
    const result = await ctx.confirm('Title', 'Message');
    expect(result).toBe(true);
  });

  it('should have input return undefined by default', async () => {
    const inkApp = {};
    const ctx = createExtensionUIContext(inkApp);
    const result = await ctx.input('Title', 'Placeholder');
    expect(result).toBeUndefined();
  });

  it('should forward setHiddenThinkingLabel to inkApp if available', () => {
    const setHiddenThinkingLabel = vi.fn();
    const inkApp = { setHiddenThinkingLabel };
    const ctx = createExtensionUIContext(inkApp);
    ctx.setHiddenThinkingLabel('Label');
    expect(setHiddenThinkingLabel).toHaveBeenCalledWith('Label');
  });

  it('should forward setCustomEditorComponent to inkApp if available', () => {
    const setCustomEditorComponent = vi.fn();
    const inkApp = { setCustomEditorComponent };
    const ctx = createExtensionUIContext(inkApp);
    const factory = () => null;
    ctx.setEditorComponent(factory);
    expect(setCustomEditorComponent).toHaveBeenCalledWith(factory);
  });

  it('should forward getToolsExpanded from inkApp', () => {
    const inkApp = { toolOutputExpanded: true };
    const ctx = createExtensionUIContext(inkApp);
    expect(ctx.getToolsExpanded()).toBe(true);
  });

  it('should forward setToolsExpanded to inkApp if available', () => {
    const setToolOutputExpanded = vi.fn();
    const inkApp = { setToolOutputExpanded };
    const ctx = createExtensionUIContext(inkApp);
    ctx.setToolsExpanded(false);
    expect(setToolOutputExpanded).toHaveBeenCalledWith(false);
  });

  it('pasteToEditor should insert text at cursor position', () => {
    const setText = vi.fn();
    const getText = vi.fn(() => 'existing');
    const cursorPosition = 4;
    const inkApp = { defaultEditor: { setText, getText, cursorPosition } };
    const ctx = createExtensionUIContext(inkApp);
    ctx.pasteToEditor('INSERT');
    expect(setText).toHaveBeenCalledWith('exisINSERTting');
  });

  it('getEditorText should return editor text or empty', () => {
    const inkApp = { defaultEditor: { getText: () => 'text' } };
    const ctx = createExtensionUIContext(inkApp);
    expect(ctx.getEditorText()).toBe('text');
  });

  it('editor should return prefill', async () => {
    const inkApp = {};
    const ctx = createExtensionUIContext(inkApp);
    const result = await ctx.editor('Title', 'prefill');
    expect(result).toBe('prefill');
  });

  it('setTheme should return success', () => {
    const inkApp = {};
    const ctx = createExtensionUIContext(inkApp);
    const result = ctx.setTheme('dark');
    expect(result.success).toBe(true);
  });

  it('notify should be a noop', () => {
    const inkApp = {};
    const ctx = createExtensionUIContext(inkApp);
    expect(() => ctx.notify('msg')).not.toThrow();
  });

  it('addAutocompleteProvider should be a noop', () => {
    const inkApp = {};
    const ctx = createExtensionUIContext(inkApp);
    expect(() => ctx.addAutocompleteProvider(() => [])).not.toThrow();
  });

  it('custom should return undefined', async () => {
    const inkApp = {};
    const ctx = createExtensionUIContext(inkApp);
    const result = await ctx.custom(() => null);
    expect(result).toBeUndefined();
  });
});
