"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const Modal = ({ children, onClose }) => {
    return ((0, jsx_runtime_1.jsx)(ink_1.Box, { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "black", children: (0, jsx_runtime_1.jsx)(ink_1.Box, { borderStyle: "round", borderColor: "white", padding: 1, children: children }) }));
};
exports.Modal = Modal;
//# sourceMappingURL=Modal.js.map