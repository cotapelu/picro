"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const Modal_1 = require("./Modal");
const useTheme_1 = require("../hooks/useTheme");
const SelectModal = ({ title, options, onSelect, onCancel }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        setSelectedIndex(0);
    }, [options]);
    const handleKey = (input, key) => {
        if (key.escape) {
            onCancel();
            return;
        }
        if (key.return) {
            onSelect(options[selectedIndex]);
            return;
        }
        if (key.upArrow) {
            setSelectedIndex(prev => Math.max(0, prev - 1));
            return;
        }
        if (key.downArrow) {
            setSelectedIndex(prev => Math.min(options.length - 1, prev + 1));
            return;
        }
    };
    (0, ink_1.useInput)(handleKey);
    return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: onCancel, children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "cyan", children: title }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: options.map((opt, idx) => ((0, jsx_runtime_1.jsx)(ink_1.Box, { children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: idx === selectedIndex ? theme.selectedForeground || 'green' : theme.foreground, backgroundColor: idx === selectedIndex ? theme.selectedBackground || undefined : undefined, children: [idx === selectedIndex ? '> ' : '  ', opt] }) }, opt))) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "\u2191\u2193 navigate, Enter select, Esc cancel" }) })] }) }));
};
exports.SelectModal = SelectModal;
//# sourceMappingURL=SelectModal.js.map