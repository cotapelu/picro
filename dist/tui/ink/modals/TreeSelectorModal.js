"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeSelectorModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const useTheme_1 = require("../hooks/useTheme");
const Modal_1 = require("./Modal");
const TreeSelectorModal = ({ runtime, onClose, onSelect }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const [branches, setBranches] = (0, react_1.useState)([]);
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        // Load branches from session manager
        try {
            const manager = runtime.session?.sessionManager;
            if (manager?.getBranch) {
                const branchList = manager.getBranch();
                setBranches(branchList.map((b) => b.id || String(b)));
            }
            else {
                setBranches(['main']);
            }
        }
        catch {
            setBranches(['main']);
        }
    }, [runtime]);
    const handleKey = (input, key) => {
        if (key.escape) {
            onClose();
            return;
        }
        if (key.return) {
            // Switch to selected branch
            const branchId = branches[selectedIndex];
            if (onSelect) {
                onSelect(branchId);
            }
            onClose();
            return;
        }
        if (key.upArrow) {
            setSelectedIndex(prev => Math.max(0, prev - 1));
            return;
        }
        if (key.downArrow) {
            setSelectedIndex(prev => Math.min(branches.length - 1, prev + 1));
            return;
        }
    };
    (0, ink_1.useInput)(handleKey);
    return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: onClose, children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "cyan", children: "Session Tree" }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: branches.map((branch, idx) => ((0, jsx_runtime_1.jsx)(ink_1.Box, { children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: idx === selectedIndex ? theme.selectedForeground || 'white' : theme.foreground, children: [idx === selectedIndex ? '> ' : '  ', branch] }) }, branch))) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "\u2191\u2193 navigate, Enter switch, Esc cancel" }) })] }) }));
};
exports.TreeSelectorModal = TreeSelectorModal;
//# sourceMappingURL=TreeSelectorModal.js.map