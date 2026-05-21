import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { darkTheme, lightTheme } from '../../core/themes';

interface ThemeContextValue {
  theme: any;
  isDark: boolean;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: 'dark' | 'light';
}

export function ThemeProvider({ children, initialMode = 'dark' }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(initialMode === 'dark');

  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
