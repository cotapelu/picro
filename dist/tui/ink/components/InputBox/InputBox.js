"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputBox = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const useTheme_1 = require("../../hooks/useTheme");
function getCommonPrefix(strings) {
    if (strings.length === 0)
        return '';
    const first = strings[0];
    for (let i = 0; i < first.length; i++) {
        const char = first[i];
        for (let j = 1; j < strings.length; j++) {
            if (strings[j][i] !== char) {
                return first.slice(0, i);
            }
        }
    }
    return first;
}
const InputBox = ({ value, onChange, onSubmit, placeholder = '', disabled = false, multiline = true, autoFocus = true, onSlashCommand, onTab, cwd, onPathComplete, onExternalEdit, onAutocomplete, }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const [cursorPosition, setCursorPosition] = (0, react_1.useState)(value.length);
    const inputRef = (0, react_1.useRef)(value);
    const historyRef = (0, react_1.useRef)([]);
    const historyIndexRef = (0, react_1.useRef)(-1);
    const killRingRef = (0, react_1.useRef)('');
    // Keep ref in sync
    (0, react_1.useEffect)(() => {
        inputRef.current = value;
        setCursorPosition(value.length);
        // Notify slash command changes
        if (onSlashCommand && value.startsWith('/')) {
            onSlashCommand(value);
        }
    }, [value, onSlashCommand]);
    // Command history navigation
    const navigateHistory = (0, react_1.useCallback)((direction) => {
        const history = historyRef.current;
        if (history.length === 0)
            return;
        if (direction === 'up') {
            if (historyIndexRef.current < history.length - 1) {
                historyIndexRef.current++;
                const newValue = history[history.length - 1 - historyIndexRef.current];
                onChange(newValue);
            }
        }
        else {
            if (historyIndexRef.current > 0) {
                historyIndexRef.current--;
                const newValue = history[history.length - 1 - historyIndexRef.current];
                onChange(newValue);
            }
            else if (historyIndexRef.current === 0) {
                historyIndexRef.current = -1;
                onChange('');
            }
        }
    }, [onChange]);
    // Handle input
    (0, ink_1.useInput)(async (input, key) => {
        if (disabled)
            return;
        // Submit with Enter
        if (key.return && (!multiline || !key.shift)) {
            if (value.trim()) {
                // Add to history if not empty and different from last
                const history = historyRef.current;
                if (history.length === 0 || history[history.length - 1] !== value) {
                    historyRef.current = [...history, value];
                }
                historyIndexRef.current = -1;
                onSubmit(value);
            }
            return;
        }
        // Newline with Shift+Enter in multiline mode
        if (key.return && multiline && key.shift) {
            onChange(value + '\n');
            return;
        }
        // Cancel with Ctrl+C
        if (key.ctrl && input === 'c') {
            process.exit(0);
            return;
        }
        // History navigation
        if (key.upArrow) {
            navigateHistory('up');
            return;
        }
        if (key.downArrow) {
            navigateHistory('down');
            return;
        }
        // Kill ring: Ctrl+K (kill to end of line), Ctrl+Y (yank)
        if (key.ctrl && input === 'k') {
            // Kill from cursor to end
            const before = value.slice(0, cursorPosition);
            const killed = value.slice(cursorPosition);
            // Store in kill ring
            killRingRef.current = killed;
            onChange(before);
            setCursorPosition(before.length);
            return;
        }
        if (key.ctrl && input === 'y') {
            const killRing = killRingRef.current;
            const newValue = value.slice(0, cursorPosition) + killRing + value.slice(cursorPosition);
            onChange(newValue);
            setCursorPosition(cursorPosition + killRing.length);
            return;
        }
        // Backspace
        if (key.backspace || input === '\x7f') {
            if (cursorPosition > 0) {
                const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
                onChange(newValue);
                setCursorPosition(cursorPosition - 1);
            }
            return;
        }
        // Delete
        if (key.delete) {
            if (cursorPosition < value.length) {
                const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
                onChange(newValue);
            }
            return;
        }
        // Move cursor left/right
        if (key.leftArrow) {
            if (cursorPosition > 0) {
                setCursorPosition(cursorPosition - 1);
            }
            return;
        }
        if (key.rightArrow) {
            if (cursorPosition < value.length) {
                setCursorPosition(cursorPosition + 1);
            }
            return;
        }
        // Move to beginning/end
        if (key.ctrl && input === 'a') {
            setCursorPosition(0);
            return;
        }
        if (key.ctrl && input === 'e') {
            setCursorPosition(value.length);
            return;
        }
        // Tab - autocomplete (path completion + extension providers)
        if (key.tab) {
            const before = value.slice(0, cursorPosition);
            const lastSpace = before.lastIndexOf(' ');
            const tokenStart = lastSpace === -1 ? 0 : lastSpace + 1;
            const partial = before.slice(tokenStart);
            const completions = [];
            // Path completion (if token contains '/' and onPathComplete provided)
            if (onPathComplete && partial.includes('/')) {
                try {
                    const pathCompletions = await onPathComplete(partial);
                    completions.push(...pathCompletions);
                }
                catch { }
            }
            // Generic autocomplete from extension providers
            if (!completions.length && onAutocomplete && partial.length > 0) {
                try {
                    const autoCompletions = await onAutocomplete(partial);
                    completions.push(...autoCompletions);
                }
                catch { }
            }
            if (completions.length > 0) {
                let replacement;
                if (completions.length === 1) {
                    replacement = completions[0];
                }
                else {
                    const common = getCommonPrefix(completions);
                    replacement = common.length > partial.length ? common : completions[0];
                }
                const newValue = value.slice(0, tokenStart) + replacement + value.slice(cursorPosition);
                onChange(newValue);
                setCursorPosition(tokenStart + replacement.length);
            }
            else {
                onTab?.();
            }
            return;
        }
        // External editor (Ctrl+Alt+E)
        if (key.ctrl && input === 'e' && key.alt) {
            if (onExternalEdit) {
                const edited = await onExternalEdit(value);
                onChange(edited);
                setCursorPosition(edited.length);
            }
            return;
        }
        // Printable characters
        if (input.length === 1 && !key.ctrl && !key.meta) {
            const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
            onChange(newValue);
            setCursorPosition(cursorPosition + 1);
            // Detect slash command at start of input
            if (input === '/' && cursorPosition === 0) {
                onSlashCommand?.('/');
            }
            else if (onSlashCommand && value.slice(0, cursorPosition).startsWith('/')) {
                // Update slash filter as user types
                const newPrefix = newValue.slice(0, cursorPosition + 1);
                if (newPrefix.startsWith('/')) {
                    onSlashCommand(newPrefix);
                }
            }
        }
    });
    // Render input line with cursor
    const renderInputLine = () => {
        const beforeCursor = value.slice(0, cursorPosition);
        const afterCursor = value.slice(cursorPosition);
        const isSlashMode = value.startsWith('/');
        return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: "cyan", children: "> " }), isSlashMode && ((0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: theme.accent, children: "[CMD] " })), (0, jsx_runtime_1.jsx)(ink_1.Text, { children: beforeCursor }), (0, jsx_runtime_1.jsx)(ink_1.Text, { inverse: true, children: afterCursor.charAt(0) || ' ' }), (0, jsx_runtime_1.jsx)(ink_1.Text, { children: afterCursor.slice(1) }), value.length === 0 && cursorPosition === 0 && ((0, jsx_runtime_1.jsx)(ink_1.Text, { color: theme.dim, children: placeholder }))] }));
    };
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", children: [renderInputLine(), multiline && value.includes('\n') && ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "gray", children: "(Multiline mode: Shift+Enter for new line, Enter to submit)" }) }))] }));
};
exports.InputBox = InputBox;
//# sourceMappingURL=InputBox.js.map