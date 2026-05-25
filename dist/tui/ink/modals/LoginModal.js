"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const LoginModal = ({ onLogin, onClose }) => {
    const [apiKey, setApiKey] = (0, react_1.useState)('');
    const [status, setStatus] = (0, react_1.useState)('idle');
    const [errorMsg, setErrorMsg] = (0, react_1.useState)('');
    const handleLogin = (0, react_1.useCallback)(async () => {
        if (!apiKey.trim()) {
            setStatus('error');
            setErrorMsg('API key cannot be empty');
            return;
        }
        setStatus('loading');
        try {
            await onLogin(apiKey.trim());
            onClose();
        }
        catch (err) {
            setStatus('error');
            setErrorMsg(err.message || 'Failed to login');
        }
    }, [apiKey, onLogin, onClose]);
    (0, ink_1.useInput)((input, key) => {
        if (key.escape) {
            onClose();
            return;
        }
        if (key.return) {
            handleLogin();
            return;
        }
        if (key.backspace || input === '\x7f') {
            setApiKey((prev) => prev.slice(0, -1));
            return;
        }
        if (input.length === 1 && !key.ctrl && !key.meta) {
            setApiKey((prev) => prev + input);
        }
    });
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "green", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: "green", bold: true, children: "Enter API Key" }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { marginTop: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: "gray", children: "API Key: " }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "cyan", children: [apiKey, (0, jsx_runtime_1.jsx)(ink_1.Text, { inverse: true, children: "_" })] })] }), status === 'error' && ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "red", children: errorMsg }) })), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { children: "Press Enter to submit, Esc to cancel" }) })] }));
};
exports.LoginModal = LoginModal;
//# sourceMappingURL=LoginModal.js.map