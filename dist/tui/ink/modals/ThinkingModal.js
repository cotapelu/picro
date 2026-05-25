"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThinkingModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
const ThinkingModal = ({ currentLevel, onChange, }) => {
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(THINKING_LEVELS.indexOf(currentLevel));
    (0, ink_1.useInput)((input, key) => {
        if (key.escape) {
            onChange(currentLevel); // No change
            return;
        }
        if (key.return) {
            onChange(THINKING_LEVELS[selectedIndex]);
            return;
        }
        if (key.upArrow) {
            setSelectedIndex((prev) => Math.max(0, prev - 1));
            return;
        }
        if (key.downArrow) {
            setSelectedIndex((prev) => Math.min(THINKING_LEVELS.length - 1, prev + 1));
            return;
        }
    });
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: "yellow", bold: true, children: "Select Thinking Level" }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: THINKING_LEVELS.map((level, idx) => ((0, jsx_runtime_1.jsxs)(ink_1.Box, { children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { color: idx === selectedIndex ? 'white' : 'gray', backgroundColor: idx === selectedIndex ? 'yellow' : undefined, children: [idx === selectedIndex ? '> ' : '  ', level] }), idx === selectedIndex && ((0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "black", backgroundColor: "yellow", children: [' ', "(current: ", currentLevel, ")"] }))] }, level))) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { children: "\u2191\u2193 to navigate, Enter to select, Esc to cancel" }) })] }));
};
exports.ThinkingModal = ThinkingModal;
//# sourceMappingURL=ThinkingModal.js.map