// scripts/check-jsx-string-children.cjs
//
// Audit helper: find JSX elements whose children include a bare string /
// template literal. Ink's <Box> (like Yoga) does not render raw text - it needs
// <Text> - so `<Box>foo</Box>` silently produces an empty line. Type checks do
// not catch this; only a render test does. This script keeps the audit cheap.
//
// Usage: node scripts/check-jsx-string-children.cjs [glob...]

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const roots = process.argv.slice(2);
const globs = roots.length
  ? roots
  : ['src/tui/ink/**/*.tsx', 'src/modes/interactive/**/*.tsx'];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function collect(patterns) {
  const files = [];
  for (const pattern of patterns) {
    const base = pattern.split('*')[0].replace(/\/$/, '');
    if (!fs.existsSync(base)) continue;
    walk(base, files);
  }
  return [...new Set(files)];
}

/** True when a JSX child subtree is text-only (no JSX element children). */
function hasBareText(node) {
  for (const child of node.children) {
    if (ts.isJsxText(child)) {
      const text = child.getText().replace(/\s+/g, '');
      if (text.length > 0) return true;
      continue;
    }
    if (ts.isJsxExpression(child) && child.expression) {
      const expr = child.expression;
      if (ts.isStringLiteralLike(expr) || ts.isNoSubstitutionTemplateLiteral(expr) || ts.isTemplateExpression(expr)) {
        return true;
      }
    }
  }
  return false;
}

const files = collect(globs);
const findings = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'Box') {
      if (hasBareText(node)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
        findings.push(`${file}:${line + 1} <Box> ${JSON.stringify(node.getText().slice(0, 60))}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

if (findings.length === 0) {
  console.log(`ok: no bare text children in <Box> across ${files.length} files`);
  process.exit(0);
}
console.error(`found ${findings.length} <Box> with bare text children (Ink renders these as blank):`);
for (const f of findings) console.error('  ' + f);
process.exit(1);
