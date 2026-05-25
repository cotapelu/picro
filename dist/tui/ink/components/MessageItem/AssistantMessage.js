"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantMessage = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const useTheme_1 = require("../../hooks/useTheme");
const AssistantMessage = ({ content, thinkingBlocks, hideThinkingBlock = false, hiddenThinkingLabel = 'Thinking...', }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const renderThinking = () => {
        if (!thinkingBlocks || thinkingBlocks.length === 0)
            return null;
        if (hideThinkingBlock) {
            return ((0, jsx_runtime_1.jsx)(ink_1.Text, { italic: true, color: theme.thinkingText || theme.dim, children: hiddenThinkingLabel }));
        }
        return ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", children: thinkingBlocks.map((tb, i) => ((0, jsx_runtime_1.jsxs)(ink_1.Text, { italic: true, color: theme.thinkingText || theme.dim, children: ["[Thinking: ", tb, "]"] }, i))) }));
    };
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", children: [renderThinking(), (0, jsx_runtime_1.jsx)(ink_1.Text, { children: content })] }));
};
exports.AssistantMessage = AssistantMessage;
//# sourceMappingURL=AssistantMessage.js.map