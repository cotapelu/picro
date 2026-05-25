"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const ConfirmationModal = ({ title, message, onConfirm, onCancel, }) => {
    const [confirmed, setConfirmed] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        // Auto-focus: default to cancel for safety
        setConfirmed(false);
    }, []);
    (0, ink_1.useInput)((input, key) => {
        if (key.escape) {
            onCancel();
            return;
        }
        if (key.return) {
            if (confirmed) {
                onConfirm();
            }
            else {
                onCancel();
            }
            return;
        }
        if (key.leftArrow || key.rightArrow) {
            setConfirmed(prev => !prev);
            return;
        }
    });
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "yellow", children: title }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { children: message }) }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { marginTop: 1, gap: 2, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: confirmed ? 'green' : 'white', children: "[Yes]" }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: !confirmed ? 'green' : 'white', children: "[No]" }), (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "\u2190 \u2192 to navigate, Enter to confirm, Esc to cancel" })] })] }));
};
exports.ConfirmationModal = ConfirmationModal;
//# sourceMappingURL=ConfirmationModal.js.map