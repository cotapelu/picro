interface ThemeContextValue {
    theme: any;
    isDark: boolean;
    toggleTheme: () => void;
}
export interface ThemeProviderProps {
    children: React.ReactNode;
    initialMode?: 'dark' | 'light';
}
export declare function ThemeProvider({ children, initialMode }: ThemeProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useTheme(): ThemeContextValue;
export {};
//# sourceMappingURL=useTheme.d.ts.map