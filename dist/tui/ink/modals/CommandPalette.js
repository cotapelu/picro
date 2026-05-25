"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandPalette = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const useTheme_1 = require("../hooks/useTheme");
const CommandPalette = ({ commands, onSelect, onClose, initialFilter = '', }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const [filter, setFilter] = (0, react_1.useState)(initialFilter);
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    const filteredCommands = commands.filter((cmd) => cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(filter.toLowerCase()));
    // Reset selection when filter changes
    (0, react_1.useEffect)(() => {
        setSelectedIndex(0);
    }, [filter]);
    // Handle input
    (0, ink_1.useInput)((input, key) => {
        if (key.escape) {
            onClose();
            return;
        }
        if (key.return) {
            if (filteredCommands[selectedIndex]) {
                onSelect(filteredCommands[selectedIndex].id);
            }
            return;
        }
        if (key.upArrow) {
            setSelectedIndex((prev) => Math.max(0, prev - 1));
            return;
        }
        if (key.downArrow) {
            setSelectedIndex((prev) => Math.min(filteredCommands.length - 1, prev + 1));
            return;
        }
        if (input.length === 1 && !key.ctrl && !key.meta) {
            setFilter((prev) => prev + input);
        }
    });
    // Close on blur? Not really applicable, but Escape handles close.
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: theme.accent, padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: theme.accent, children: "Command Palette" }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: theme.dim, children: "Filter: " }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: theme.foreground, children: filter })] }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: filteredCommands.length === 0 ? ((0, jsx_runtime_1.jsxs)(ink_1.Text, { color: theme.dim, children: ["No commands match \"", filter, "\""] })) : (filteredCommands.map((cmd, idx) => ((0, jsx_runtime_1.jsxs)(ink_1.Box, { children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { color: idx === selectedIndex ? theme.selectedForeground || 'white' : theme.secondary, backgroundColor: idx === selectedIndex ? theme.selectedBackground || 'blue' : undefined, bold: idx === selectedIndex, children: [idx === selectedIndex ? '> ' : '  ', cmd.label] }), cmd.shortcut && ((0, jsx_runtime_1.jsxs)(ink_1.Text, { color: theme.dim, children: [' ', "[", cmd.shortcut, "]"] })), cmd.description && ((0, jsx_runtime_1.jsxs)(ink_1.Text, { color: theme.dim, children: [' ', "- ", cmd.description] }))] }, cmd.id)))) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: theme.dim, children: "Use \u2191\u2193 to navigate, Enter to select, Esc to close" }) })] }));
};
exports.CommandPalette = CommandPalette;
//# sourceMappingURL=CommandPalette.js.map