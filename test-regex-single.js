const line = "import { ThemeProvider, useTheme } from './hooks/useTheme';";
const m = line.match(/(\s*import\s+[^;]*from\s+['"]([^'"]+)['"])/);
console.log(m ? m[2] : 'no match');
