"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const Armin_1 = require("../Armin");
const Header = ({ title, status, thinkingLevel, model, theme, showArmin = false, resourceCounts }) => {
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { borderStyle: "single", borderBottom: true, paddingX: 1, justifyContent: "space-between", children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { gap: 1, children: [showArmin && (0, jsx_runtime_1.jsx)(Armin_1.Armin, { size: 1 }), (0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "cyan", children: title })] }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { gap: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "gray", children: ["Model: ", model] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "green", children: ["Thinking: ", thinkingLevel] }), theme && (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "cyan", children: ["Theme: ", theme] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: status.startsWith('Error') ? 'red' : 'green', children: ["[", status, "]"] }), resourceCounts && ((0, jsx_runtime_1.jsxs)(ink_1.Box, { gap: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { dim: true, children: ["E:", resourceCounts.extensions] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { dim: true, children: ["S:", resourceCounts.skills] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { dim: true, children: ["P:", resourceCounts.prompts] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { dim: true, children: ["T:", resourceCounts.themes] })] }))] })] }));
};
exports.Header = Header;
//# sourceMappingURL=Header.js.map