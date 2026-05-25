"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageItem = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const useTheme_1 = require("../../hooks/useTheme");
const AssistantMessage_1 = require("./AssistantMessage");
const UserMessage_1 = require("./UserMessage");
const ToolExecution_1 = require("./ToolExecution");
const BashExecution_1 = require("./BashExecution");
const MessageItem = ({ message, onToolToggle, expandedTools = new Set(), hideThinkingBlock = false, }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const renderContent = (content) => {
        // Simple wrapping - in production, use a proper text wrapper
        const maxWidth = 80; // Will be adjusted by parent
        const lines = [];
        const words = content.split(' ');
        let currentLine = '';
        for (const word of words) {
            if ((currentLine + ' ' + word).length > maxWidth) {
                lines.push(currentLine);
                currentLine = word;
            }
            else {
                currentLine = currentLine ? currentLine + ' ' + word : word;
            }
        }
        if (currentLine)
            lines.push(currentLine);
        return lines.map((line, i) => ((0, jsx_runtime_1.jsx)(ink_1.Text, { children: line }, i)));
    };
    const renderToolCalls = (toolCalls) => {
        return toolCalls.map((tool) => {
            const isExpanded = expandedTools.has(tool.id);
            return ((0, jsx_runtime_1.jsx)(ToolExecution_1.ToolExecution, { toolCall: tool, expanded: isExpanded, onToggle: () => onToolToggle?.(tool.id) }, tool.id));
        });
    };
    const shouldShowRole = message.role !== 'user'; // user messages don't need role label in chat
    const roleColor = message.role === 'assistant' ? theme.success : message.role === 'tool' ? theme.accent : theme.primary;
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", marginBottom: 1, children: [shouldShowRole && ((0, jsx_runtime_1.jsxs)(ink_1.Text, { bold: true, color: roleColor, children: [message.role === 'assistant' ? 'Assistant' : message.role === 'tool' ? 'Tool' : 'User', ":"] })), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", marginLeft: shouldShowRole ? 2 : 0, children: [message.role === 'user' && ((0, jsx_runtime_1.jsx)(UserMessage_1.UserMessage, { text: message.content })), message.role === 'assistant' && ((0, jsx_runtime_1.jsx)(AssistantMessage_1.AssistantMessage, { content: message.content, thinkingBlocks: message.thinkingBlocks, hideThinkingBlock: hideThinkingBlock })), message.role === 'bashExecution' && ((0, jsx_runtime_1.jsx)(BashExecution_1.BashExecution, { command: message.bashCommand || '', output: message.bashOutput || '', exitCode: message.bashExitCode, cancelled: message.bashCancelled, truncated: message.bashTruncated })), (message.role === 'tool' || message.role === 'compactionSummary' || message.role === 'branchSummary' || message.role === 'custom') && ((0, jsx_runtime_1.jsx)(ink_1.Text, { children: message.content })), message.toolCalls && message.toolCalls.length > 0 && ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", children: renderToolCalls(message.toolCalls) })), message.error && ((0, jsx_runtime_1.jsxs)(ink_1.Text, { color: theme.error, children: ["Error: ", message.error] })), message.streaming && !message.content && ((0, jsx_runtime_1.jsx)(ink_1.Text, { color: theme.dim, children: "..." }))] })] }));
};
exports.MessageItem = MessageItem;
//# sourceMappingURL=MessageItem.js.map