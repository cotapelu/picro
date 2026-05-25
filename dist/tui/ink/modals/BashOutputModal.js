"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BashOutputModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const useTheme_1 = require("../hooks/useTheme");
const Modal_1 = require("./Modal");
const BashOutputModal = ({ command, output, error = false, onClose }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    (0, react_1.useEffect)(() => {
        // Auto-close after some time? For now, require manual close
    }, []);
    const handleKey = (input, key) => {
        if (key.escape || key.return || key.ctrl) {
            onClose();
        }
    };
    (0, ink_1.useInput)(handleKey);
    return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: onClose, children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: error ? 'red' : 'green', padding: 1, width: 100, children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { bold: true, color: error ? 'red' : 'green', children: ["Bash: ", command] }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: output.split('\n').map((line, i) => ((0, jsx_runtime_1.jsx)(ink_1.Text, { color: error ? 'red' : 'gray', children: line || '\u00A0' }, i))) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "Press any key to close" }) })] }) }));
};
exports.BashOutputModal = BashOutputModal;
//# sourceMappingURL=BashOutputModal.js.map