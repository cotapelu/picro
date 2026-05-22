/** Extension UIContext creation for InkApp. Uses 'any' for external types to avoid dependency issues. */

// Minimal theme stub
const themeStub = { dim: '', accent: '', error: '', success: '', warning: '', border: '' };

export function createExtensionUIContext(inkApp: any): any {
  return {
    select: (title: string, options: readonly string[], opts?: any) => {
      return Promise.resolve(options[0]);
    },
    confirm: (title: string, message: string, opts?: any) => {
      return Promise.resolve(true);
    },
    input: (title: string, placeholder?: string, opts?: any) => {
      return Promise.resolve(undefined);
    },
    notify: (message: string, type?: string) => {},
    onTerminalInput: (handler: any) => {
      return () => {};
    },
    setStatus: (key: string, text: string | undefined) => {},
    setWorkingMessage: (message: string) => {},
    setWorkingIndicator: (options?: any) => {},
    setHiddenThinkingLabel: (label?: string) => {
      if (inkApp.setHiddenThinkingLabel) inkApp.setHiddenThinkingLabel(label);
    },
    setWidget: (key: string, content: any, options?: any) => {},
    setFooter: (factory: any) => {},
    setHeader: (factory: any) => {},
    setTitle: (title: string) => {},
    custom: (factory: any, options?: any) => {
      return Promise.resolve(undefined);
    },
    pasteToEditor: (text: string) => {
      const editor = inkApp.defaultEditor;
      if (editor) {
        const current = editor.getText?.() ?? '';
        const pos = editor.cursorPosition ?? current.length;
        const newText = current.slice(0, pos) + text + current.slice(pos);
        editor.setText?.(newText);
      }
    },
    setEditorText: (text: string) => {
      inkApp.defaultEditor?.setText?.(text);
    },
    getEditorText: () => {
      return inkApp.defaultEditor?.getText?.() ?? '';
    },
    editor: (title: string, prefill?: string) => {
      return Promise.resolve(prefill);
    },
    addAutocompleteProvider: (factory: any) => {},
    setEditorComponent: (factory: any) => {
      if (inkApp.setCustomEditorComponent) inkApp.setCustomEditorComponent(factory);
    },
    get theme() {
      return themeStub;
    },
    getAllThemes: () => [],
    getTheme: (name: string) => null,
    setTheme: (themeOrName: any) => {
      return { success: true };
    },
    getToolsExpanded: () => {
      return inkApp.toolOutputExpanded ?? false;
    },
    setToolsExpanded: (expanded: boolean) => {
      if (inkApp.setToolOutputExpanded) inkApp.setToolOutputExpanded(expanded);
    },
  };
}
