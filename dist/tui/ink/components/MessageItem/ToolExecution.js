"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolExecution = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const useTheme_1 = require("../../hooks/useTheme");
const output_guards_1 = require("../../utils/output-guards");
const ToolExecution = ({ toolCall, expanded, onToggle }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const renderArgs = () => {
        try {
            const json = JSON.stringify(toolCall.arguments, null, 2);
            return json;
        }
        catch {
            return String(toolCall.arguments);
        }
    };
    const renderResult = () => {
        if (!toolCall.result)
            return null;
        try {
            const json = JSON.stringify(toolCall.result, null, 2);
            return json;
        }
        catch {
            return String(toolCall.result);
        }
    };
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", marginLeft: 2, children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { bold: true, color: expanded ? theme.accent : theme.warning, onPress: onToggle, children: [expanded ? '▼' : '▶', " ", toolCall.name] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: theme.dim, children: [" - ", toolCall.status] })] }), expanded && ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", marginLeft: 2, children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { color: theme.dim, children: ["Input: ", renderArgs()] }), toolCall.result && ((0, jsx_runtime_1.jsxs)(ink_1.Text, { color: toolCall.status === 'error' ? theme.error : theme.dim, children: ["Output: ", (0, output_guards_1.sanitizeAndTruncate)(renderResult() ?? '')] }))] }))] }));
};
exports.ToolExecution = ToolExecution;
//# sourceMappingURL=ToolExecution.js.map