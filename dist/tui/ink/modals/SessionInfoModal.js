"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionInfoModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const useTheme_1 = require("../hooks/useTheme");
const Modal_1 = require("./Modal");
const SessionInfoModal = ({ runtime, onClose }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const [info, setInfo] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const sessionManager = runtime.session;
        const session = sessionManager?.getSession?.() || runtime.session;
        const infoData = {
            id: session.id,
            name: session.name,
            messageCount: session.messages?.length || 0,
            cwd: runtime.cwd,
            model: session?.model?.id || 'unknown',
        };
        setInfo(infoData);
    }, [runtime]);
    const handleKey = (input, key) => {
        if (key.escape) {
            onClose();
        }
    };
    (0, ink_1.useInput)(handleKey);
    if (!info) {
        return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: onClose, children: (0, jsx_runtime_1.jsx)(ink_1.Box, { children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "yellow", children: "Loading session info..." }) }) }));
    }
    return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: onClose, children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "cyan", children: "Session Info" }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["ID: ", info.id] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Name: ", info.name || '(unnamed)'] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Messages: ", info.messageCount] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["CWD: ", info.cwd] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Model: ", info.model] })] }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "Press Esc to close" }) })] }) }));
};
exports.SessionInfoModal = SessionInfoModal;
//# sourceMappingURL=SessionInfoModal.js.map