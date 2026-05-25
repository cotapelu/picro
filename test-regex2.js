const line = "import { ThemeProvider, useTheme } from './hooks/useTheme';";
const staticMatch = line.match(/(\s*import\s+[^;]*from\s+['"]([^'"]+)['"])/);
console.log('full match', staticMatch);
if (staticMatch) {
  const full = staticMatch[0];
  const imp = staticMatch[1]; // the full part
  const path = staticMatch[2];
  console.log('full part:', full);
  console.log('path:', path);
}
