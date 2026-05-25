const fs = require('fs');
const path = require('path');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  // Static import: from "./path" -> from "./path.js"
  let newContent = content.replace(/(from\s+['"](\.\.?\/[^'\."]+)['"])/g, (match, p1) => {
    const pathStr = p1.replace(/^from\s+['"]|['"]$/g, '');
    // If path already has an extension, skip
    if (pathStr.includes('.')) return match;
    return p1.replace(/(['"])$/, '.js$1');
  });
  // Dynamic import: import("./path") -> import("./path.js")
  newContent = newContent.replace(/(import\s*\()(['"](\.\.?\/[^'\."]+)['"])(\))/g, (match, start, p2, end) => {
    const pathStr = p2.replace(/^['"]|['"]$/g, '');
    if (pathStr.includes('.')) return match;
    return start + pathStr + '.js' + end;
  });
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed', file);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      fixFile(full);
    }
  }
}
walk('src/tui');
