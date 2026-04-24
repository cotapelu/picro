#!/usr/bin/env node
/**
 * Tool Reference Docs Generator
 *
 * Scans tool classes in src/tools and generates a Markdown reference
 * in docs/tools.md.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FileTools } from '../packages/coding-agent/src/tools/file-tools.js';
import { CodeTools } from '../packages/coding-agent/src/tools/code-tools.js';
import { CommandTools } from '../packages/coding-agent/src/tools/command-tools.js';
import { SearchTools } from '../packages/coding-agent/src/tools/search-tools.js';
import type { ToolDefinition } from '@picro/agent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Collect all tool classes
const toolClasses = [
  { name: 'file', cls: FileTools },
  { name: 'code', cls: CodeTools },
  { name: 'command', cls: CommandTools },
  { name: 'search', cls: SearchTools },
];

let markdown = `# Tool Reference\n\nCoding Agent provides a set of built-in tools for file operations, code analysis, system commands, and more.\n\n## Available Tools\n\n`;

for (const { name: category, cls: ToolCls } of toolClasses) {
  const instance = new ToolCls({});
  const tools: ToolDefinition[] = (instance as any).getTools();
  markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Tools (\`${category}\`)\n\n`;
  for (const tool of tools) {
    markdown += `#### \`${tool.name}\`\n\n`;
    if (tool.description) markdown += `${tool.description}\n\n`;
    markdown += `**Parameters:**\n\n`;
    const props = tool.parameters?.properties || {};
    const required = tool.parameters?.required || [];
    for (const [key, schema] of Object.entries(props)) {
      const type = (schema as any).type || 'any';
      const desc = (schema as any).description || '';
      const req = required.includes(key) ? 'required' : 'optional';
      markdown += `- \`${key}\` (\`${type}\`), ${req}${desc ? `: ${desc}` : ''}\n`;
    }
    markdown += '\n';
  }
}

// Write to docs/tools.md
const outPath = path.resolve(__dirname, '../packages/coding-agent/docs/tools.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, markdown, 'utf-8');
console.log(`Generated tools.md at ${outPath}`);
