const line = "import { ThemeProvider, useTheme } from './hooks/useTheme';";
const pattern = /(\s*import\s+[^;]*from\s+['"]([^'"]+)['"])/;
console.log('pattern matches?', line.match(pattern));
