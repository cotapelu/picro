import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CodeTools } from '../src/tools/code-tools.ts';
import * as fs from 'fs';
import * as path from 'path';
const fsp = fs.promises;

describe('CodeTools Extended', () => {
  let tmpDir: string;
  let codeTools: CodeTools;

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp('tmp-code-ext-');
    codeTools = new CodeTools({ basePath: tmpDir });
  });

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  describe('detectLanguage extended', () => {
    const extensions: [string, string][] = [
      ['.c', 'c'], ['.cpp', 'cpp'], ['.h', 'c'], ['.hpp', 'cpp'],
      ['.cs', 'csharp'], ['.rb', 'ruby'], ['.php', 'php'], ['.swift', 'swift'],
      ['.kt', 'kotlin'], ['.scala', 'scala'], ['.sh', 'shell'], ['.bash', 'shell'],
      ['.zsh', 'shell'], ['.ps1', 'powershell'], ['.sql', 'sql'], ['.html', 'html'],
      ['.scss', 'scss'], ['.sass', 'sass'], ['.less', 'less'], ['.xml', 'xml'],
      ['.yaml', 'yaml'], ['.yml', 'yaml'], ['.toml', 'toml'], ['.md', 'markdown'],
      ['.txt', 'text'],
    ];

    extensions.forEach(([ext, lang]) => {
      it(`detects ${ext} as ${lang}`, () => {
        const ct = codeTools as any;
        expect(ct.detectLanguage(`file${ext}`)).toBe(lang);
      });
    });
  });

  describe('code_analyze errors', () => {
    it('throws when file not found', async () => {
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_analyze')!.handler;
      await expect(handler({}, { path: 'none.ts' })).rejects.toThrow('File not found');
    });

    it('throws when path missing', async () => {
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_analyze')!.handler;
      await expect(handler({}, {})).rejects.toThrow('File path is required');
    });

    it('analyzes Python file', async () => {
      const content = 'def greet():\n    pass\n\nclass Person:\n    pass\n';
      await fsp.writeFile(path.join(tmpDir, 'test.py'), content);
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_analyze')!.handler;
      const result = JSON.parse(await handler({}, { path: 'test.py' }));
      expect(result.language).toBe('python');
      expect(result.patterns.functions).toBe(1);
      expect(result.patterns.classes).toBe(1);
    });

    it('analyzes Java file', async () => {
      const content = 'import java.util.List;\nclass Main {\n    void run() {}\n}\n';
      await fsp.writeFile(path.join(tmpDir, 'Main.java'), content);
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_analyze')!.handler;
      const result = JSON.parse(await handler({}, { path: 'Main.java' }));
      expect(result.language).toBe('java');
      expect(result.patterns.classes).toBe(1);
    });

    it('analyzes Go file', async () => {
      const content = 'package main\nimport "fmt"\nfunc main() {}\ntype User struct{}\n';
      await fsp.writeFile(path.join(tmpDir, 'main.go'), content);
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_analyze')!.handler;
      const result = JSON.parse(await handler({}, { path: 'main.go' }));
      expect(result.language).toBe('go');
      expect(result.patterns.functions).toBe(1);
    });
  });

  describe('code_find_references', () => {
    it('throws when symbol missing', async () => {
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_find_references')!.handler;
      await expect(handler({}, {})).rejects.toThrow('Symbol name is required');
    });

    it('finds references', async () => {
      const srcDir = path.join(tmpDir, 'src');
      await fsp.mkdir(srcDir);
      await fsp.writeFile(path.join(srcDir, 'a.ts'), 'function test() {}\n', 'utf-8');
      await fsp.writeFile(path.join(srcDir, 'b.ts'), 'test();\n', 'utf-8');
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_find_references')!.handler;
      const result = JSON.parse(await handler({}, { symbol: 'test', path: 'src' }));
      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });
  });

  describe('code_extract_function', () => {
    it('throws when args missing', async () => {
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_extract_function')!.handler;
      await expect(handler({}, { path: 'x.ts' })).rejects.toThrow('required');
    });

    it('throws for invalid line range', async () => {
      await fsp.writeFile(path.join(tmpDir, 'test.ts'), 'line1\n');
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_extract_function')!.handler;
      await expect(handler({}, { path: 'test.ts', startLine: 5, endLine: 10, functionName: 'foo' }))
        .rejects.toThrow('Invalid line range');
    });

    it('extracts TypeScript function', async () => {
      await fsp.writeFile(path.join(tmpDir, 'test.ts'), 'const x = 1;\nconst y = 2;\n');
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_extract_function')!.handler;
      const result = JSON.parse(await handler({}, { path: 'test.ts', startLine: 1, endLine: 2, functionName: 'calc' }));
      expect(result.success).toBe(true);
      expect(result.functionCode).toContain('function calc');
    });

    it('extracts Python function', async () => {
      await fsp.writeFile(path.join(tmpDir, 'test.py'), 'x = 1\ny = 2\n');
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_extract_function')!.handler;
      const result = JSON.parse(await handler({}, { path: 'test.py', startLine: 1, endLine: 2, functionName: 'calc' }));
      expect(result.success).toBe(true);
      expect(result.functionCode).toContain('def calc');
    });
  });

  describe('code_rename_symbol', () => {
    it('throws when args missing', async () => {
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_rename_symbol')!.handler;
      await expect(handler({}, { path: 'x.ts' })).rejects.toThrow('required');
    });

    it('renames symbol in file', async () => {
      await fsp.writeFile(path.join(tmpDir, 'test.ts'), 'const foo = 1;\nconsole.log(foo);\n');
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_rename_symbol')!.handler;
      const result = JSON.parse(await handler({}, { path: 'test.ts', oldName: 'foo', newName: 'bar' }));
      expect(result.success).toBe(true);
      expect(result.occurrences).toBe(2);
      expect(result.newContent).toContain('bar');
      expect(result.newContent).not.toContain('const foo');
    });
  });

  describe('code_lint', () => {
    it('throws when path missing', async () => {
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_lint')!.handler;
      await expect(handler({}, {})).rejects.toThrow('File path is required');
    });

    it('throws when file not found', async () => {
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_lint')!.handler;
      await expect(handler({}, { path: 'none.ts' })).rejects.toThrow('File not found');
    });

    it('finds linting issues', async () => {
      const content = 'const x = 1;  \n\tconst y = 2;\n// TODO fix this\n// FIXME urgent\nconsole.log("test");\nconst veryLongLine = "this is a very long line that exceeds the 120 character limit by a lot";\n';
      await fsp.writeFile(path.join(tmpDir, 'test.ts'), content);
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_lint')!.handler;
      const result = JSON.parse(await handler({}, { path: 'test.ts' }));
      expect(result.success).toBe(true);
      expect(result.summary.errors).toBeGreaterThan(0); // FIXME found
      expect(result.summary.warnings).toBeGreaterThan(0); // console.log, trailing whitespace, tabs
      expect(result.summary.info).toBeGreaterThan(0); // TODO found
      expect(result.issues.some((i: any) => i.message.includes('TODO'))).toBe(true);
      expect(result.issues.some((i: any) => i.message.includes('FIXME'))).toBe(true);
      // console.log detection may vary based on implementation
    });
  });

  describe('code_format', () => {
    it('throws when path missing', async () => {
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_format')!.handler;
      await expect(handler({}, {})).rejects.toThrow('File path is required');
    });

    it('formats file with tabs and trailing whitespace', async () => {
      const content = 'const x = 1;  \n\tconst y = 2;\nconst z = 3;\n';
      await fsp.writeFile(path.join(tmpDir, 'test.ts'), content);
      const tools = codeTools.getTools();
      const handler = tools.find(t => t.name === 'code_format')!.handler;
      const result = JSON.parse(await handler({}, { path: 'test.ts' }));
      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);
      expect(result.formatted).not.toContain('\t');
      expect(result.summary.tabsReplaced).toBe(1);
      expect(result.summary.trailingWhitespaceRemoved).toBe(1);
    });
  });
});
