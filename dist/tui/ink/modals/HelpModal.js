"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const slash_commands_1 = require("../../../runtime/slash-commands");
const HelpModal = ({ onClose }) => {
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "cyan", children: "Slash Commands" }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: slash_commands_1.BUILTIN_SLASH_COMMANDS.map(cmd => ((0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["/", cmd.name, " - ", cmd.description] }, cmd.name))) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "Press Esc to close" }) })] }));
};
exports.HelpModal = HelpModal;
//# sourceMappingURL=HelpModal.js.map