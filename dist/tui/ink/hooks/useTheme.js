"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeProvider = ThemeProvider;
exports.useTheme = useTheme;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const themes_1 = require("../themes");
const ThemeContext = (0, react_1.createContext)(null);
function ThemeProvider({ children, initialMode = 'dark' }) {
    const [isDark, setIsDark] = (0, react_1.useState)(initialMode === 'dark');
    const toggleTheme = (0, react_1.useCallback)(() => {
        setIsDark(prev => !prev);
    }, []);
    const theme = isDark ? themes_1.darkTheme : themes_1.lightTheme;
    return ((0, jsx_runtime_1.jsx)(ThemeContext.Provider, { value: { theme, isDark, toggleTheme }, children: children }));
}
function useTheme() {
    const ctx = (0, react_1.useContext)(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
}
//# sourceMappingURL=useTheme.js.map