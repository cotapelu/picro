// Custom Tool Definition Example
//
// Shows how to define a custom tool that reads file size.

import { ToolDefinition } from '@picro/agent';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

const fileSizeTool: ToolDefinition = {
  name: 'file_size',
  description: 'Get size of a file in bytes',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file' },
    },
    required: ['path'],
  },
  handler: async (input: { path: string }) => {
    const fullPath = join(process.cwd(), input.path);
    const stats = statSync(fullPath);
    return `Size of ${input.path}: ${stats.size} bytes`;
  },
};

console.log('Tool definition:', fileSizeTool);
