const fs = require('fs');
const path = require('path');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let changed = false;
  const newLines = lines.map(line => {
    // Static import: import ... from '...'
    const staticMatch = line.match(/(\s*import\s+[^;]*from\s+['"]([^'"]+)['"])/);
    if (staticMatch) {
      console.log('LINE MATCH:', line.trim());
      const imp = staticMatch[2];
      if (!imp.startsWith('node:') && !imp.startsWith('http') && !imp.includes('.') && imp.startsWith('.')) {
        line = line.replace(imp, imp + '.js');
        changed = true;
      }
    }
    // Dynamic import: import('...')
    const dynamicMatch = line.match(/(\simport\s*\()(['"]([^'"]+)['"])(\))/);
    if (dynamicMatch) {
      console.log('DYNAMIC MATCH:', line.trim());
      const imp = dynamicMatch[2];
      if (!imp.startsWith('node:') && !imp.startsWith('http') && !imp.includes('.') && imp.startsWith('.')) {
        line = line.replace(imp, imp + '.js');
        changed = true;
      }
    }
    return line;
  });
  if (changed) {
    fs.writeFileSync(file, newLines.join('\n') + '\n', 'utf8');
    console.log('Fixed', file);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.js$/.test(entry.name)) {
      console.log('Processing', full);
      processFile(full);
    }
  }
}
walk('dist/tui');
