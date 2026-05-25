const fs = require('fs');
const path = require('path');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let changed = false;
  const newLines = lines.map(line => {
    let replaced = false;
    // Static import: import ... from '...'
    const staticMatch = line.match(/(\s*import\s+[^;]*from\s+['"]([^'"]+)['"])/);
    if (staticMatch) {
      const imp = staticMatch[2];
      if (!imp.startsWith('node:') && imp.startsWith('.')) {
        const basename = imp.split('/').pop();
        if (!basename.includes('.')) {
          line = line.replace(imp, imp + '.js');
          changed = true;
          replaced = true;
        }
      }
    }
    // Dynamic import: import('...')
    const dynamicMatch = line.match(/(\simport\s*\()(['"]([^'"]+)['"])(\))/);
    if (dynamicMatch) {
      const imp = dynamicMatch[2];
      if (!imp.startsWith('node:') && imp.startsWith('.')) {
        const basename = imp.split('/').pop();
        if (!basename.includes('.')) {
          line = line.replace(imp, imp + '.js');
          changed = true;
          replaced = true;
        }
      }
    }
    if (replaced) {
      console.log('  REPLACED:', line.trim());
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
      processFile(full);
    }
  }
}
walk('dist/tui');
