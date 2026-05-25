const esbuild = require('esbuild');
const { glob } = require('glob');
const path = require('path');

(async () => {
  const outDir = 'dist/tui';

  // Find all .ts and .tsx files under src/tui
  const files = glob.sync('src/tui/**/*.{ts,tsx}', { nodir: true });

  if (files.length === 0) {
    console.error('No TUI source files found');
    process.exit(1);
  }

  await esbuild.build({
    entryPoints: files,
    bundle: false,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outdir: outDir,
    outbase: 'src/tui',
    jsx: 'automatic',
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
    },
    // Output .js files
    outExtension: { '.js': '.js' },
    // Avoid adding banners
    banner: { js: '' },
    logLevel: 'silent',
  });

  // Create package.json to mark as ESM
  require('fs').writeFileSync(`${outDir}/package.json`, '{"type":"module"}');
  console.log(`Built TUI to ${outDir}`);
})().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
