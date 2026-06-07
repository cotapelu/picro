/** Extension UIContext creation for InkApp. Uses 'any' for external types to avoid dependency issues. */

// Minimal theme stub
const themeStub = { dim: '', accent: '', error: '', success: '', warning: '', border: '' };

export function createExtensionUIContext(inkApp: any): any {
  return {
    // Agent requests
    select: (title: string, options: readonly string[], opts?: any) => {
      if (inkApp.showSelectorModal) {
        return inkApp.showSelectorModal(title, options, opts);
      }
      return Promise.resolve(options[0]);
    },
    confirm: (title: string, message: string, opts?: any) => {
      if (inkApp.showConfirmModal) {
        return inkApp.showConfirmModal(title, message, opts);
      }
      return Promise.resolve(true);
    },
    input: (title: string, placeholder?: string, opts?: any) => {
      if (inkApp.showInputModal) {
        return inkApp.showInputModal(title, placeholder, opts);
      }
      return Promise.resolve(undefined);
    },
    notify: (message: string, type?: string) => {
      if (inkApp.notify) {
        inkApp.notify(message, type);
      } else if (inkApp.addToast) {
        let toastType: 'info' | 'success' | 'error' = 'info';
        if (type === 'error') toastType = 'error';
        else if (type === 'success') toastType = 'success';
        inkApp.addToast(message, toastType);
      }
    },
    onTerminalInput: (handler: any) => {
      if (inkApp.onTerminalInput) {
        return inkApp.onTerminalInput(handler);
      }
      return () => {};
    },
    setStatus: (key: string, text: string | undefined) => {
      if (inkApp.setStatus) {
        inkApp.setStatus(key, text);
      }
    },
    setWorkingMessage: (message: string) => {
      if (inkApp.setWorkingMessage) {
        inkApp.setWorkingMessage(message);
      }
    },
    setWorkingVisible: (visible: boolean) => {
      if (inkApp.setWorkingVisible) {
        inkApp.setWorkingVisible(visible);
      }
    },
    setWorkingIndicator: (options?: any) => {
      if (inkApp.setWorkingIndicator) {
        inkApp.setWorkingIndicator(options);
      }
    },
    setHiddenThinkingLabel: (label?: string) => {
      if (inkApp.setHiddenThinkingLabel) inkApp.setHiddenThinkingLabel(label);
    },
    setWidget: (key: string, content: any, options?: any) => {
      if (inkApp.setExtensionWidget) {
        const placement = options?.placement ?? 'above';
        inkApp.setExtensionWidget(placement, key, content, options);
      }
    },
    setFooter: (factory: any) => {
      if (inkApp.setCustomFooter) {
        inkApp.setCustomFooter(factory);
      }
    },
    setHeader: (factory: any) => {
      if (inkApp.setCustomHeader) {
        inkApp.setCustomHeader(factory);
      }
    },
    setTitle: (title: string) => {
      if (inkApp.setTitle) {
        inkApp.setTitle(title);
      }
    },
    custom: (factory: any, options?: any) => {
      if (inkApp.showCustomOverlay) {
        return inkApp.showCustomOverlay(factory, options);
      }
      return Promise.resolve(undefined);
    },
    pasteToEditor: (text: string) => {
      if (inkApp.pasteToEditor) {
        inkApp.pasteToEditor(text);
        return;
      }
      const editor = inkApp.defaultEditor;
      if (editor) {
        const current = editor.getText?.() ?? '';
        const pos = editor.cursorPosition ?? current.length;
        const newText = current.slice(0, pos) + text + current.slice(pos);
        editor.setText?.(newText);
      }
    },
    setEditorText: (text: string) => {
      if (inkApp.setEditorText) {
        inkApp.setEditorText(text);
      } else {
        inkApp.defaultEditor?.setText?.(text);
      }
    },
    getEditorText: () => {
      if (inkApp.getEditorText) {
        return inkApp.getEditorText();
      }
      return inkApp.defaultEditor?.getText?.() ?? '';
    },
    editor: (title: string, prefill?: string, opts?: any) => {
      if (inkApp.showEditorModal) {
        return inkApp.showEditorModal(title, prefill, opts);
      }
      return Promise.resolve(prefill);
    },
    addAutocompleteProvider: (factory: any) => {
      if (inkApp.addAutocompleteProvider) {
        inkApp.addAutocompleteProvider(factory);
      }
    },
    setEditorComponent: (factory: any) => {
      if (inkApp.setCustomEditorComponent) inkApp.setCustomEditorComponent(factory);
    },
    get theme() {
      if (inkApp.getTheme) {
        return inkApp.getTheme();
      }
      return themeStub;
    },
    getAllThemes: () => {
      if (inkApp.getAllThemes) {
        return inkApp.getAllThemes();
      }
      return [];
    },
    getTheme: (name: string) => {
      if (inkApp.getTheme) {
        return inkApp.getTheme(name);
      }
      return null;
    },
    setTheme: (themeOrName: any) => {
      if (inkApp.setTheme) {
        return inkApp.setTheme(themeOrName);
      }
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
