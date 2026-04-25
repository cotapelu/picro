import { CodeTools } from '../src/tools/code-tools.ts';
import * as fs from 'fs';
import * as path from 'path';

const fsp = fs.promises;

describe('CodeTools', () => {
  let tmpDir: string;
  let codeTools: CodeTools;

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp('tmp-code-');
    codeTools = new CodeTools({ basePath: tmpDir });
  });

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  describe('detectLanguage', () => {
    it('should map .ts and .tsx to typescript', () => {
      const ct = codeTools as any;
      expect(ct.detectLanguage('file.ts')).toBe('typescript');
      expect(ct.detectLanguage('file.tsx')).toBe('typescript');
    });

    it('should map .js and .jsx to javascript', () => {
      const ct = codeTools as any;
      expect(ct.detectLanguage('app.js')).toBe('javascript');
      expect(ct.detectLanguage('app.jsx')).toBe('javascript');
    });

    it('should map common extensions correctly', () => {
      const ct = codeTools as any;
      expect(ct.detectLanguage('script.py')).toBe('python');
      expect(ct.detectLanguage('Main.java')).toBe('java');
      expect(ct.detectLanguage('program.go')).toBe('go');
      expect(ct.detectLanguage('lib.rs')).toBe('rust');
      expect(ct.detectLanguage('style.css')).toBe('css');
      expect(ct.detectLanguage('data.json')).toBe('json');
    });

    it('should return unknown for unknown extensions', () => {
      const ct = codeTools as any;
      expect(ct.detectLanguage('file.xyz')).toBe('unknown');
    });
  });

  describe('getTools', () => {
    it('should return all expected code analysis tools', () => {
      const tools = codeTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      const names = tools.map(t => t.name);
      expect(names).toContain('code_analyze');
      expect(names).toContain('code_find_references');
      expect(names).toContain('code_extract_function');
      expect(names).toContain('code_rename_symbol');
      expect(names).toContain('code_lint');
      expect(names).toContain('code_format');
    });
  });

  describe('code_analyze', () => {
    it('should analyze a Typescript file and return stats and patterns', async () => {
      const content = `// A comment\nfunction foo(a: number): number { return a * 2; }\n\nconst x = 5;\n`;
      const filePath = path.join(tmpDir, 'sample.ts');
      await fsp.writeFile(filePath, content, 'utf-8');

      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_analyze')!.handler;
      const resultStr = await handler({}, { path: 'sample.ts' });
      const result = JSON.parse(resultStr);

      expect(result.success).toBe(true);
      expect(result.path).toBe('sample.ts');
      expect(result.language).toBe('typescript');
      expect(result.stats.totalLines).toBe(5); // includes trailing empty line
      expect(result.stats.commentLines).toBe(1); // one comment
      expect(result.stats.codeLines).toBe(2); // two non-empty non-comment lines
      expect(result.stats.blankLines).toBe(2); // two blank lines
      expect(result.patterns.functions).toBe(1);
      expect(result.patterns.classes).toBe(0);
      expect(result.items.length).toBeGreaterThan(0);
    });
  });
});
