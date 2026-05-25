const line = "import { ThemeProvider, useTheme } from './hooks/useTheme';";
const pattern = /(from\s+['"](\.\.?\/[^'."]+)['"])/;
const m = line.match(pattern);
console.log('match:', m);
if (m) {
  const p1 = m[1];
  const newP1 = p1.replace(/(['"])$/, (q) => '.js' + q);
  const newLine = line.replace(p1, newP1);
  console.log('new:', newLine);
}
