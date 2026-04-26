#!/usr/bin/env node
/**
 * Tier Test Runner
 * Runs all tier tests from bottom to top
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tiers = [
  { name: 'Tier 1: Utility Functions', file: 'tier1-utils.test.ts' },
  { name: 'Tier 2: Basic Components', file: 'tier2-components.test.ts' },
  { name: 'Tier 3: Interactive Components', file: 'tier3-interactive.test.ts' },
  { name: 'Tier 4: Terminal and TUI Core', file: 'tier4-terminal.test.ts' },
  { name: 'Tier 5: Full Integration', file: 'tier5-integration.test.ts' },
];

console.log('🧪 TUI Tier Test Suite');
console.log('='.repeat(60));
console.log('Testing from bottom layer to top layer...\n');

let totalPassed = 0;
let totalFailed = 0;

for (const tier of tiers) {
  console.log(`\n📋 ${tier.name}`);
  console.log('-'.repeat(60));

  const testPath = join(__dirname, tier.file);

  if (!existsSync(testPath)) {
    console.log(`❌ Test file not found: ${testPath}`);
    totalFailed++;
    continue;
  }

  try {
    const output = execSync(`npx tsx "${testPath}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    console.log(output);

    // Parse results from output
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);

    if (passedMatch && failedMatch) {
      const passed = parseInt(passedMatch[1], 10);
      const failed = parseInt(failedMatch[1], 10);
      totalPassed += passed;
      totalFailed += failed;

      if (failed === 0) {
        console.log(`✅ ${tier.name} - PASSED`);
      } else {
        console.log(`❌ ${tier.name} - FAILED`);
      }
    }
  } catch (error) {
    console.log(`❌ ${tier.name} - ERROR`);
    console.log(error instanceof Error ? error.message : String(error));
    totalFailed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 Overall Results');
console.log('='.repeat(60));
console.log(`Total Passed: ${totalPassed}`);
console.log(`Total Failed: ${totalFailed}`);

if (totalFailed === 0) {
  console.log('\n🎉 ALL TIERS PASSED!');
  console.log('✅ The TUI is ready for production use.');
  process.exit(0);
} else {
  console.log('\n❌ SOME TIERS FAILED!');
  console.log('Please fix the failing tests before using the TUI.');
  process.exit(1);
}
