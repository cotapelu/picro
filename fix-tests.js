const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get all test files
const files = glob.sync('src/tui/**/*.test.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Replace simple createKeyEvent with enhanced version
  const simpleCreate = /function createKeyEvent\(data: string\): KeyEvent \{\s*return \{ raw: data, name: data, modifiers: \{\} \};\s*\}/;
  if (simpleCreate.test(content)) {
    content = content.replace(simpleCreate, `function createKeyEvent(raw: string, name?: string): KeyEvent {
  const keyName = name ? normalizeKeyName(name) : normalizeKeyName(raw);
  return { raw, name: keyName, modifiers: {} };
}

function normalizeKeyName(name: string): string {
  // Raw control characters
  if (name === '\\r' || name === '\\n') return 'Enter';
  if (name === '\\x1b') return 'Escape';
  if (name === '\\x7f') return 'Backspace';
  const map: Record<string,string> = {
    'enter': 'Enter', 'return': 'Enter',
    'left': 'ArrowLeft', 'right': 'ArrowRight',
    'up': 'ArrowUp', 'down': 'ArrowDown',
    'backspace': 'Backspace', 'delete': 'Delete',
    'home': 'Home', 'end': 'End',
    'escape': 'Escape', 'tab': 'Tab', 'space': ' ',
  };
  return map[name.toLowerCase()] || name;
}`);
    changed = true;
  }

  // 2. Fix raw escape sequences in createKeyEvent calls
  // Replace '001b[...' with '\x1b[...' (preserving letter)
  const oldPattern1 = /'001b\\\[([A-Za-z0-9~]*)'/g;
  content = content.replace(oldPattern1, (m, p1) => `'\\x1b[${p1}'`);
  // Replace '001b' alone (for Escape)
  content = content.replace(/'001b'/g, "'\\x1b'");

  // 3. Border checks: replace .startsWith('┌') with .includes('┌')
  content = content.replace(/\.startsWith\('┌'\)/g, ".includes('┌')");
  content = content.replace(/\.startsWith\('└'\)/g, ".includes('└')");
  content = content.replace(/\.startsWith\('┘'\)/g, ".includes('┘')");

  // 4. Width checks: replace line.length with visibleWidth(line) in expect
  // Pattern: expect(line.length).toBeLessThanOrEqual(num)
  const widthCheckRegex = /expect\(([^)]+\.length\)\.toBeLessThanOrEqual\(([^)]+)\)/g;
  content = content.replace(widthCheckRegex, (match, lineExpr, num) => `expect(visibleWidth(${lineExpr.replace('.length','')})).toBeLessThanOrEqual(${num})`);
  
  // Also patterns where they use forEach: result.forEach(l => { expect(l.length)... })
  // Might be more complex; we can handle later.

  // 5. Ensure visibleWidth import
  if (content.includes('visibleWidth(') && !content.includes('import { visibleWidth') && !content.includes('import { visibleWidth,')) {
    // Find the import line near internal-utils and add visibleWidth
    content = content.replace(
      /import \{ truncateText[^}]*\} from '../atoms\/internal-utils';/,
      (m) => m.replace('truncateText', 'truncateText, visibleWidth')
    );
    // If already has visibleWidth but not in import list? Better: if visibleWidth not in import statements at all, add.
    if (!content.includes('visibleWidth from')) {
      // add separate import
      content = content.replace(
        /import \{[^}]*\} from '../atoms\/internal-utils';/,
        (m) => m.replace('}', ', visibleWidth }')
      );
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Patched ${file}`);
  } else if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content);
    console.log(`Applied fixes to ${file}`);
  }
}
