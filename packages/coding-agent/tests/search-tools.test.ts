import { SearchTools } from '../src/tools/search-tools.ts';
import * as fs from 'fs';
import * as path from 'path';

const fsp = fs.promises;

describe('SearchTools', () => {
  let tmpDir: string;
  let searchTools: SearchTools;

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp('tmp-search-');
    searchTools = new SearchTools({ basePath: tmpDir });
  });

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  describe('getTools', () => {
    it('should return expected search tool definitions', () => {
      const tools = searchTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      const names = tools.map(t => t.name);
      expect(names).toContain('search_files');
      expect(names).toContain('search_content');
      expect(names).toContain('grep');
      expect(names).toContain('find');
      expect(names).toContain('find_by_extension');
    });
  });

  describe('find', () => {
    it('should find files by name pattern', async () => {
      // Create some files
      fs.writeFileSync(path.join(tmpDir, 'a.ts'), '');
      fs.writeFileSync(path.join(tmpDir, 'b.js'), '');
      fs.mkdirSync(path.join(tmpDir, 'sub'));
      fs.writeFileSync(path.join(tmpDir, 'sub', 'c.ts'), '');

      const tools = searchTools.getTools();
      const handler = tools.find(t => t.name === 'find')!.handler;
      const result = (await handler({}, { name: '\\.ts$' })) as string;
      // The result is a formatted string; check it includes .ts files
      expect(result).toContain('a.ts');
      expect(result).toContain('c.ts');
      expect(result).not.toContain('b.js');
    });

    it('can filter by type (files only)', async () => {
      fs.writeFileSync(path.join(tmpDir, 'file1.txt'), '');
      fs.mkdirSync(path.join(tmpDir, 'dir1'));

      const tools = searchTools.getTools();
      const handler = tools.find(t => t.name === 'find')!.handler;
      const result = (await handler({}, { type: 'f' })) as string;
      expect(result).toContain('file1.txt');
      expect(result).not.toContain('dir1');
    });

    it('respects ignore patterns (node_modules)', async () => {
      // Create node_modules folder with file
      fs.mkdirSync(path.join(tmpDir, 'node_modules'));
      fs.writeFileSync(path.join(tmpDir, 'node_modules', 'pkg.js'), '');
      fs.writeFileSync(path.join(tmpDir, 'src.js'), '');

      const tools = searchTools.getTools();
      const handler = tools.find(t => t.name === 'find')!.handler;
      const result = (await handler({})) as string;
      expect(result).toContain('src.js');
      expect(result).not.toContain('node_modules');
    });
  });

  describe('search_files', () => {
    it('should find files matching pattern recursively', async () => {
      // Create structure
      fs.writeFileSync(path.join(tmpDir, 'app.ts'), '');
      fs.mkdirSync(path.join(tmpDir, 'lib'));
      fs.writeFileSync(path.join(tmpDir, 'lib', 'util.ts'), '');
      fs.mkdirSync(path.join(tmpDir, 'dist'));
      fs.writeFileSync(path.join(tmpDir, 'dist', 'bundle.js'), '');

      const tools = searchTools.getTools();
      const handler = tools.find(t => t.name === 'search_files')!.handler;
      // pattern for .ts files
      const result = (await handler({}, { pattern: '\\.ts$', recursive: true })) as string;
      expect(result).toContain('app.ts');
      expect(result).toContain('lib/util.ts');
      expect(result).not.toContain('bundle.js');
      expect(result).not.toContain('dist'); // pattern only matches files
    });

    it('should respect ignore patterns', async () => {
      fs.writeFileSync(path.join(tmpDir, 'src.ts'), '');
      fs.mkdirSync(path.join(tmpDir, 'build'));
      fs.writeFileSync(path.join(tmpDir, 'build', 'out.ts'), '');

      const tools = searchTools.getTools();
      const handler = tools.find(t => t.name === 'search_files')!.handler;
      // use pattern '.*' to match all files
      const result = (await handler({}, { pattern: '.*', recursive: true })) as string;
      expect(result).toContain('src.ts');
      expect(result).not.toContain('out.ts'); // 'build' is ignored by default
    });
  });

  describe('search_content', () => {
    it('should find files containing a string', async () => {
      fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'Hello world');
      fs.writeFileSync(path.join(tmpDir, 'b.txt'), 'Goodbye universe');

      const tools = searchTools.getTools();
      const handler = tools.find(t => t.name === 'search_content')!.handler;
      const result = (await handler({}, { query: 'world', recursive: false })) as string;
      expect(result).toContain('a.txt');
      expect(result).not.toContain('b.txt');
    });

    it('can include line numbers in output', async () => {
      fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'line1\nline2\nworld\nline4');
      const tools = searchTools.getTools();
      const handler = tools.find(t => t.name === 'search_content')!.handler;
      const result = (await handler({}, { query: 'world', includeLineNumbers: true })) as string;
      // Result is formatted as "file:line: text" lines
      expect(result).toContain('a.txt');
      expect(result).toContain('world');
      // line numbers appear as "a.txt:3:" pattern
      expect(result).toMatch(/a\.txt:\d+: world/);
    });
  });

  // Additional tests for grep and find_by_extension could be added but are skipped for now.
});
