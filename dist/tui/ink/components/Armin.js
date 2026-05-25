"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Armin = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const useTheme_1 = require("../hooks/useTheme");
const Armin = ({ size = 1 }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    // Simple ASCII logo for now
    const logo = [
        '   _    ',
        '  /|\\   ',
        ' / | \\  ',
        '/__|__\\ ',
        '   |    ',
        '   |    ',
    ];
    return ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", children: logo.map((line, i) => ((0, jsx_runtime_1.jsx)(ink_1.Text, { color: theme.accent, children: line }, i))) }));
};
exports.Armin = Armin;
//# sourceMappingURL=Armin.js.map