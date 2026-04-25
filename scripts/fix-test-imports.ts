import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const testsDir = '/home/quangtynu/Qcoder/picro/packages/coding-agent/tests';
const files = readdirSync(testsDir).filter(f => f.endsWith('.test.ts'));

for (const file of files) {
  const filepath = join(testsDir, file);
  let content = readFileSync(filepath, 'utf-8');
  
  // Replace imports from ../src/*.js to ../src/*.ts
  content = content.replace(/from\s+['"](\.\.\/src\/[^'"]+)\.js['"]/g, "from '$1.ts'");
  
  writeFileSync(filepath, content);
  console.log(`Fixed ${file}`);
}

console.log('Done!');
