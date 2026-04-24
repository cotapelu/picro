/**
 * TUI Test Runner
 */
import { spawn } from 'node:child_process';

interface Suite { name: string; file: string; }
const suites: Suite[] = [
  { name: 'Utils', file: './test/utils.test.ts' },
  { name: 'Components', file: './test/components.test.ts' },
  { name: 'Terminal', file: './test/terminal.test.ts' },
  { name: 'TUI', file: './test/tui.test.ts' },
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         TUI Test Suite                                     ║');
console.log('╚════════════════════════════════════════════════════════════╝');

let total = 0;
let passed = 0;
let failed = 0;

async function runSuite(suite: Suite): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n─── ${suite.name} Tests ───`);
    
    const proc = spawn('npx', ['tsx', suite.file], { cwd: process.cwd(), stdio: 'pipe' });
    let output = '';
    
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    proc.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });
    
    proc.on('close', (code) => {
      const match = output.match(/Total:\s*(\d+)/);
      const failMatch = output.match(/Failed:\s*(\d+)/);
      const t = match ? parseInt(match[1], 10) : 0;
      const f = failMatch ? parseInt(failMatch[1], 10) : 0;
      total += t;
      passed += (t - f);
      failed += f;
      resolve(code === 0 && f === 0);
    });
  });
}

async function runAll(): Promise<void> {
  let allPassed = true;
  
  for (const suite of suites) {
    const ok = await runSuite(suite);
    if (!ok) allPassed = false;
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Overall Results');
  console.log('═'.repeat(60));
  console.log(`  Suites: ${suites.length}`);
  console.log(`  Total: ${total}`);
  console.log(`  Passed: ${passed} ✓`);
  console.log(`  Failed: ${failed} ✗`);
  
  if (failed === 0) {
    console.log('\n🎉 All test suites passed!');
    process.exit(0);
  } else {
    console.log(`\n⚠️ ${failed} test(s) failed.`);
    process.exit(1);
  }
}

runAll().catch((e) => { console.error('Error:', e); process.exit(1); });
