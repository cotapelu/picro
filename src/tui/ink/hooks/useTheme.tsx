import { createContext, useState, useContext } from 'react';

interface ThemeContextValue { theme: any; toggleTheme?: () => void; }
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: any) {
  const [isDark, setIsDark] = useState(true);
  const theme = { name: 'dark' };
  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
