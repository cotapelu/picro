"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BashExecution = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const useTheme_1 = require("../../hooks/useTheme");
const output_guards_1 = require("../../utils/output-guards");
const BashExecution = ({ command, output, exitCode, cancelled = false, truncated = false, }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const [showOutput, setShowOutput] = (0, react_1.useState)(true);
    const isError = !cancelled && exitCode !== 0;
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", marginLeft: 2, children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { bold: true, color: isError ? theme.error : theme.accent, onPress: () => setShowOutput(!showOutput), children: [showOutput ? '▼' : '▶', " !", command] }), cancelled && (0, jsx_runtime_1.jsx)(ink_1.Text, { color: theme.warning, children: " (cancelled)" }), !cancelled && exitCode !== undefined && ((0, jsx_runtime_1.jsxs)(ink_1.Text, { color: isError ? theme.error : theme.dim, children: [" (exit ", exitCode, ")"] })), truncated && (0, jsx_runtime_1.jsx)(ink_1.Text, { color: theme.warning, children: " [truncated]" })] }), showOutput && output && ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginLeft: 2, flexDirection: "column", children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: theme.dim, children: (0, output_guards_1.sanitizeAndTruncate)(output) }) }))] }));
};
exports.BashExecution = BashExecution;
//# sourceMappingURL=BashExecution.js.map