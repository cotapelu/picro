const fs = require('fs');
const file = 'src/tui/ink/InkApp.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
let changed = false;
const newLines = lines.map(line => {
  const staticMatch = line.match(/(\s*import\s+[^;]*from\s+['"]([^'"]+)['"])/);
  if (staticMatch) {
    const imp = staticMatch[2];
    console.log('Found import:', imp);
    if (!imp.startsWith('node:') && !imp.startsWith('http') && imp.startsWith('.') && !imp.includes('.')) {
      console.log('  Matched condition, adding .js');
      const newLine = line.replace(imp, imp + '.js');
      changed = true;
      return newLine;
    } else {
      console.log('  Condition failed:', { node: imp.startsWith('node:'), http: imp.startsWith('http'), startsDot: imp.startsWith('.'), hasDot: imp.includes('.') });
    }
  }
  return line;
});
if (changed) {
  fs.writeFileSync(file, newLines.join('\n') + '\n', 'utf8');
  console.log('File updated');
} else {
  console.log('No changes');
}
