"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const InputBox_1 = require("../components/InputBox/InputBox");
const Modal_1 = require("./Modal");
const InputModal = ({ title, placeholder, onSubmit, onCancel }) => {
    const [value, setValue] = (0, react_1.useState)('');
    const handleSubmit = () => {
        if (value.trim() !== '') {
            onSubmit(value);
        }
        else {
            onCancel();
        }
    };
    (0, ink_1.useInput)((input, key) => {
        if (key.escape) {
            onCancel();
            return;
        }
        if (key.return) {
            handleSubmit();
            return;
        }
    });
    return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: onCancel, children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, children: title }), (0, jsx_runtime_1.jsx)(InputBox_1.InputBox, { value: value, onChange: setValue, onSubmit: handleSubmit, placeholder: placeholder, multiline: false, autoFocus: true })] }) }));
};
exports.InputModal = InputModal;
//# sourceMappingURL=InputModal.js.map