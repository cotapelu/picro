import { MemoryStore } from './src/storage.js';
import { MemoryEngine } from './src/engine.js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const storePath = path.join(__dirname, '.benchmark-memory.json');
  const store = new MemoryStore(storePath);
  const engine = new MemoryEngine({
    store,
    topK: 5,
    cacheTTL: 0, // disable cache to measure raw retrieval
  });

  // Clear any existing data
  await engine.clear();

  // Seed 10,000 memories
  console.log('Seeding memory with 10,000 entries...');
  for (let i = 0; i < 10000; i++) {
    const isProject = i % 5 === 0;
    const content = `Memory ${i}: This is a ${isProject ? 'project' : 'file'} entry involving actions like edit_file, read_file, execute_command. ` +
                    `Additional text to increase length and ensure realistic memory size. `.repeat(10);
    // Use varied actions to test metadata filtering
    const action = i % 3 === 0 ? 'read_file' : i % 3 === 1 ? 'edit_file' : 'execute_command';
    await engine.add(content, action);
  }
  console.log('Seeding complete.');

  // Warm-up (run a few queries to populate caches if any)
  await engine.recall('project file edit');

  // Benchmark: 1000 recall operations
  const query = 'project file';
  const iterations = 1000;
  const latencies: number[] = [];
  console.log(`Running ${iterations} recall operations (query: "${query}")...`);
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await engine.recall(query);
    const end = process.hrtime.bigint();
    latencies.push(Number(end - start) / 1_000_000); // ms
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(iterations * 0.5)];
  const p95 = latencies[Math.floor(iterations * 0.95)];
  const p99 = latencies[Math.floor(iterations * 0.99)];
  const max = latencies[iterations - 1];
  const avg = latencies.reduce((a, b) => a + b, 0) / iterations;

  console.log('\nResults (ms):');
  console.log(`  avg: ${avg.toFixed(3)}`);
  console.log(`  p50: ${p50.toFixed(3)}`);
  console.log(`  p95: ${p95.toFixed(3)}`);
  console.log(`  p99: ${p99.toFixed(3)}`);
  console.log(`  max: ${max.toFixed(3)}`);

  // Cleanup
  await store.clear();
  try { fs.unlinkSync(storePath); } catch {}
  console.log('\nBenchmark complete.');
}

run().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
