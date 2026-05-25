"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMessage = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const UserMessage = ({ text }) => {
    // Simple rendering: split by lines, indent
    const lines = text.split('\n');
    return ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", paddingX: 1, children: lines.map((line, i) => ((0, jsx_runtime_1.jsx)(ink_1.Text, { children: line }, i))) }));
};
exports.UserMessage = UserMessage;
//# sourceMappingURL=UserMessage.js.map