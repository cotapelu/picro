"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangelogModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const useTheme_1 = require("../hooks/useTheme");
const Modal_1 = require("./Modal");
const ChangelogModal = ({ onClose }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const [content, setContent] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        // Placeholder - would load actual changelog
        setContent('=== CHANGELOG ===\n\n- Added new slash commands\n- Improved UI\n\n(Press Esc to close)');
    }, []);
    const handleKey = (input, key) => {
        if (key.escape) {
            onClose();
        }
    };
    (0, ink_1.useInput)(handleKey);
    return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: onClose, children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, width: 80, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "cyan", children: "Changelog" }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: content.split('\n').map((line, i) => ((0, jsx_runtime_1.jsx)(ink_1.Text, { children: line }, i))) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "Press Esc to close" }) })] }) }));
};
exports.ChangelogModal = ChangelogModal;
//# sourceMappingURL=ChangelogModal.js.map