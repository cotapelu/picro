import { jsx } from "react/jsx-runtime";
import { createContext, useState, useContext, useCallback } from "react";
import { darkTheme, lightTheme } from "../themes";
const ThemeContext = createContext(null);
function ThemeProvider({ children, initialMode = "dark" }) {
  const [isDark, setIsDark] = useState(initialMode === "dark");
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);
  const theme = isDark ? darkTheme : lightTheme;
  return /* @__PURE__ */ jsx(ThemeContext.Provider, { value: { theme, isDark, toggleTheme }, children });
}
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
export {
  ThemeProvider,
  useTheme
};
