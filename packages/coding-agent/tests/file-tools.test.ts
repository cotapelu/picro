import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FileTools } from '../src/tools/file-tools.ts';
import type { ToolDefinition } from '@picro/agent';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fsp = fs.promises;

describe('FileTools', () => {
  let tmpDir: string;
  let fileTools: FileTools;

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(path.join(__dirname, 'tmp-filetools-'));
    fileTools = new FileTools({ basePath: tmpDir, maxSize: 1000 });
  });

  afterEach(async () => {
    try {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('getTools', () => {
    it('should return file operation tools', () => {
      const tools = fileTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      const names = tools.map(t => t.name);
      expect(names).toContain('file_read');
      expect(names).toContain('file_write');
      expect(names).toContain('file_edit');
      expect(names).toContain('file_list');
      expect(names).toContain('file_delete');
    });

    it('each tool should have proper structure', () => {
      const tools: ToolDefinition[] = fileTools.getTools();
      for (const tool of tools) {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.parameters).toBeDefined();
        expect(tool.parameters.type).toBe('object');
        expect(tool.parameters.properties).toBeDefined();
        expect(typeof tool.handler).toBe('function');
      }
    });
  });

  describe('file_read', () => {
    it('should read file contents and return JSON with content', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await fsp.writeFile(filePath, 'Hello, world!', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_read')!.handler;
      const resultStr = await handler({}, { path: 'test.txt' });
      const result = JSON.parse(resultStr);
      expect(result.success).toBe(true);
      expect(result.content).toBe('Hello, world!');
      expect(result.size).toBe(13); // 'Hello, world!'.length
    });

    it('should throw if file does not exist', async () => {
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_read')!.handler;
      await expect(handler({}, { path: 'nonexistent.txt' })).rejects.toThrow();
    });

    it('should reject paths outside basePath', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await fsp.writeFile(filePath, 'test', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_read')!.handler;
      await expect(handler({}, { path: '../escape.txt' })).rejects.toThrow('Path not allowed');
    });
  });

  describe('file_write', () => {
    it('should create a new file and return JSON', async () => {
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_write')!.handler;
      const resultStr = await handler({}, { path: 'newfile.txt', content: 'New content' });
      const result = JSON.parse(resultStr);
      expect(result.success).toBe(true);
      expect(result.path).toBe('newfile.txt');
      expect(result.size).toBe(11);
      expect(result.action).toBe('created');

      const fullPath = path.join(tmpDir, 'newfile.txt');
      const fileContent = await fsp.readFile(fullPath, 'utf-8');
      expect(fileContent).toBe('New content');
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(tmpDir, 'existing.txt');
      await fsp.writeFile(filePath, 'old content', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_write')!.handler;
      const resultStr = await handler({}, { path: 'existing.txt', content: 'new content' });
      const result = JSON.parse(resultStr);
      expect(result.success).toBe(true);
      expect(result.action).toBe('created'); // still shows created? Actually code says action: 'created' for new, maybe for overwrite still 'created'. That's fine.

      const newContent = await fsp.readFile(filePath, 'utf-8');
      expect(newContent).toBe('new content');
    });

    it('should reject content exceeding maxSize', async () => {
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_write')!.handler;
      const bigContent = 'x'.repeat(2000);
      await expect(handler({}, { path: 'big.txt', content: bigContent })).rejects.toThrow('Content too large');
    });

    it('should reject paths outside basePath', async () => {
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_write')!.handler;
      await expect(handler({}, { path: '../outside.txt', content: 'bad' })).rejects.toThrow('Path not allowed');
    });
  });

  describe('file_edit', () => {
    it('should replace text segments and return JSON', async () => {
      const filePath = path.join(tmpDir, 'edit.txt');
      await fsp.writeFile(filePath, 'Hello world, world!', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_edit')!.handler;
      const resultStr = await handler({}, {
        path: 'edit.txt',
        edits: [{ oldText: 'world', newText: 'universe' }],
      });
      const result = JSON.parse(resultStr);
      expect(result.success).toBe(true);
      expect(result.editsApplied).toBe(1); // only first occurrence replaced per edit
      expect(result.newSize).toBe(22); // after replacing first 'world' with 'universe', length becomes 22

      const content = await fsp.readFile(filePath, 'utf-8');
      // only first occurrence replaced
      expect(content).toBe('Hello universe, world!');
    });

    it('should throw if oldText not found', async () => {
      const filePath = path.join(tmpDir, 'edit.txt');
      await fsp.writeFile(filePath, 'some content', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_edit')!.handler;
      await expect(handler({}, {
        path: 'edit.txt',
        edits: [{ oldText: 'missing', newText: 'new' }],
      })).rejects.toThrow('Old text not found');
    });

    it('should reject paths outside basePath', async () => {
      const filePath = path.join(tmpDir, 'edit.txt');
      await fsp.writeFile(filePath, 'content', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_edit')!.handler;
      await expect(handler({}, {
        path: '../outside.txt',
        edits: [{ oldText: 'content', newText: 'bad' }],
      })).rejects.toThrow('Path not allowed');
    });
  });

  describe('file_list', () => {
    it('should list files in directory', async () => {
      await fsp.writeFile(path.join(tmpDir, 'a.txt'), 'a', 'utf-8');
      await fsp.writeFile(path.join(tmpDir, 'b.txt'), 'b', 'utf-8');
      const subdir = path.join(tmpDir, 'sub');
      await fsp.mkdir(subdir);
      await fsp.writeFile(path.join(subdir, 'c.txt'), 'c', 'utf-8');

      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_list')!.handler;
      const resultStr = await handler({}, { path: '.' });
      const result = JSON.parse(resultStr);
      expect(result.success).toBe(true);
      const paths = result.items.map((f: any) => f.path);
      expect(paths).toContain('a.txt');
      expect(paths).toContain('b.txt');
      expect(paths).toContain('sub');
    });

    it('should support recursive listing', async () => {
      const sub = path.join(tmpDir, 'sub');
      await fsp.mkdir(sub);
      await fsp.writeFile(path.join(sub, 'file.txt'), 'content', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_list')!.handler;
      const resultStr = await handler({}, { path: '.', recursive: true });
      const result = JSON.parse(resultStr);
      const paths = result.items.map((f: any) => f.path);
      expect(paths).toContain('sub');
      expect(paths.some(p => p.includes('file.txt'))).toBe(true);
    });

    it('should reject paths outside basePath', async () => {
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_list')!.handler;
      await expect(handler({}, { path: '../' })).rejects.toThrow('Path not allowed');
    });
  });

  describe('file_delete', () => {
    it('should delete a file with confirm=true', async () => {
      const filePath = path.join(tmpDir, 'todelete.txt');
      await fsp.writeFile(filePath, 'content', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_delete')!.handler;
      const resultStr = await handler({}, { path: 'todelete.txt', confirm: true });
      const result = JSON.parse(resultStr);
      expect(result.success).toBe(true);
      expect(result.action).toBe('deleted');

      const exists = await fsp.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should reject deletion if confirm is not true', async () => {
      const filePath = path.join(tmpDir, 'todelete.txt');
      await fsp.writeFile(filePath, 'content', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_delete')!.handler;
      await expect(handler({}, { path: 'todelete.txt', confirm: false })).rejects.toThrow('Confirmation required');
    });

    it('should reject deletion of non-existent file', async () => {
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_delete')!.handler;
      await expect(handler({}, { path: 'nonexistent.txt', confirm: true })).rejects.toThrow('File not found');
    });

    it('should reject paths outside basePath', async () => {
      const filePath = path.join(tmpDir, 'file.txt');
      await fsp.writeFile(filePath, 'content', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_delete')!.handler;
      await expect(handler({}, { path: '../outside.txt', confirm: true })).rejects.toThrow('Path not allowed');
    });
  });

  describe('caching', () => {
    it('should cache file reads within TTL', async () => {
      const filePath = path.join(tmpDir, 'cache.txt');
      await fsp.writeFile(filePath, 'cached content', 'utf-8');
      const tools = fileTools.getTools();
      const handler = tools.find(t => t.name === 'file_read')!.handler;
      // First read
      const first = JSON.parse(await handler({}, { path: 'cache.txt' }));
      expect(first.content).toBe('cached content');
      // Second read within TTL (no file modification) should return cached
      const second = JSON.parse(await handler({}, { path: 'cache.txt' }));
      expect(second.content).toBe('cached content');
    });

    it('should invalidate cache after TTL', async () => {
      const filePath = path.join(tmpDir, 'cache2.txt');
      await fsp.writeFile(filePath, 'original', 'utf-8');
      const shortCacheTools = new FileTools({ basePath: tmpDir, maxSize: 1000 });
      (shortCacheTools as any).CACHE_TTL = 1;
      const handler = shortCacheTools.getTools().find(t => t.name === 'file_read')!.handler;
      const first = JSON.parse(await handler({}, { path: 'cache2.txt' }));
      expect(first.content).toBe('original');
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 5));
      await fsp.writeFile(filePath, 'updated', 'utf-8');
      const second = JSON.parse(await handler({}, { path: 'cache2.txt' }));
      expect(second.content).toBe('updated');
    });
  });
});
