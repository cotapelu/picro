const themeStub = { dim: "", accent: "", error: "", success: "", warning: "", border: "" };
function createExtensionUIContext(inkApp) {
  return {
    select: (title, options, opts) => {
      return Promise.resolve(options[0]);
    },
    confirm: (title, message, opts) => {
      return Promise.resolve(true);
    },
    input: (title, placeholder, opts) => {
      return Promise.resolve(void 0);
    },
    notify: (message, type) => {
    },
    onTerminalInput: (handler) => {
      return () => {
      };
    },
    setStatus: (key, text) => {
    },
    setWorkingMessage: (message) => {
    },
    setWorkingIndicator: (options) => {
    },
    setHiddenThinkingLabel: (label) => {
      if (inkApp.setHiddenThinkingLabel) inkApp.setHiddenThinkingLabel(label);
    },
    setWidget: (key, content, options) => {
    },
    setFooter: (factory) => {
    },
    setHeader: (factory) => {
    },
    setTitle: (title) => {
    },
    custom: (factory, options) => {
      return Promise.resolve(void 0);
    },
    pasteToEditor: (text) => {
      const editor = inkApp.defaultEditor;
      if (editor) {
        const current = editor.getText?.() ?? "";
        const pos = editor.cursorPosition ?? current.length;
        const newText = current.slice(0, pos) + text + current.slice(pos);
        editor.setText?.(newText);
      }
    },
    setEditorText: (text) => {
      inkApp.defaultEditor?.setText?.(text);
    },
    getEditorText: () => {
      return inkApp.defaultEditor?.getText?.() ?? "";
    },
    editor: (title, prefill) => {
      return Promise.resolve(prefill);
    },
    addAutocompleteProvider: (factory) => {
    },
    setEditorComponent: (factory) => {
      if (inkApp.setCustomEditorComponent) inkApp.setCustomEditorComponent(factory);
    },
    get theme() {
      return themeStub;
    },
    getAllThemes: () => [],
    getTheme: (name) => null,
    setTheme: (themeOrName) => {
      return { success: true };
    },
    getToolsExpanded: () => {
      return inkApp.toolOutputExpanded ?? false;
    },
    setToolsExpanded: (expanded) => {
      if (inkApp.setToolOutputExpanded) inkApp.setToolOutputExpanded(expanded);
    }
  };
}
export {
  createExtensionUIContext
};
