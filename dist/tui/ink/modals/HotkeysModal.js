"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HotkeysModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const useTheme_1 = require("../hooks/useTheme");
const Modal_1 = require("./Modal");
const HotkeysModal = ({ onClose }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const handleKey = (input, key) => {
        if (key.escape) {
            onClose();
        }
    };
    (0, ink_1.useInput)(handleKey);
    const keybindings = [
        { key: 'Ctrl+P', desc: 'Open command palette' },
        { key: 'Ctrl+T', desc: 'Set thinking level' },
        { key: 'Ctrl+Shift+T', desc: 'Toggle theme' },
        { key: 'Ctrl+L', desc: 'Login' },
        { key: 'Ctrl+R', desc: 'Resume session' },
        { key: 'Ctrl+Alt+E', desc: 'Edit input in external editor' },
        { key: 'Ctrl+D', desc: 'Toggle debug mode' },
        { key: 'Ctrl+C', desc: 'Exit application' },
        { key: 'Tab', desc: 'Autocomplete / command palette' },
        { key: '/', desc: 'Slash commands' },
        { key: '!', desc: 'Bash command' },
        { key: '!!', desc: 'Bash command without context' },
    ];
    return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: onClose, children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "cyan", children: "Keybindings" }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: keybindings.map((kb) => ((0, jsx_runtime_1.jsxs)(ink_1.Box, { children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: "yellow", children: kb.key.padEnd(15) }), (0, jsx_runtime_1.jsx)(ink_1.Text, { children: kb.desc })] }, kb.key))) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "Press Esc to close" }) })] }) }));
};
exports.HotkeysModal = HotkeysModal;
//# sourceMappingURL=HotkeysModal.js.map