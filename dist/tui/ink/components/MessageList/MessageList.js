"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageList = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = __importStar(require("react"));
const ink_1 = require("ink");
const MessageItem_1 = require("../MessageItem/MessageItem");
exports.MessageList = (0, react_1.forwardRef)(({ messages, theme, hideThinkingBlock = false }, ref) => {
    const [autoScroll, setAutoScroll] = (0, react_1.useState)(true);
    // Expose scrollToBottom to parent
    (0, react_1.useImperativeHandle)(ref, () => ({
        scrollToBottom: () => {
            setAutoScroll(true);
            // Scroll to bottom logic would go here if we had scrollable container
        },
    }));
    // Simple separator between messages
    const renderSeparator = (index) => {
        if (index === 0)
            return null;
        return ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginBottom: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "gray", children: "\u2500" }) }));
    };
    // Track expanded tool calls
    const [expandedTools, setExpandedTools] = (0, react_1.useState)(new Set());
    const toggleTool = (toolId) => {
        setExpandedTools((prev) => {
            const next = new Set(prev);
            if (next.has(toolId)) {
                next.delete(toolId);
            }
            else {
                next.add(toolId);
            }
            return next;
        });
    };
    return ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", overflow: "hidden", width: "100%", height: "100%", borderStyle: "round", borderBottom: true, borderTop: false, children: messages.length === 0 ? ((0, jsx_runtime_1.jsx)(ink_1.Box, { justifyContent: "center", alignItems: "center", flexGrow: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "gray", children: "No messages yet. Start typing..." }) })) : ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", width: "100%", children: messages.map((msg, index) => ((0, jsx_runtime_1.jsxs)(react_1.default.Fragment, { children: [renderSeparator(index), (0, jsx_runtime_1.jsx)(MessageItem_1.MessageItem, { message: msg, onToolToggle: toggleTool, expandedTools: expandedTools, hideThinkingBlock: hideThinkingBlock })] }, `${msg.id || index}-${msg.timestamp || Date.now()}`))) })) }));
});
exports.MessageList.displayName = 'MessageList';
//# sourceMappingURL=MessageList.js.map