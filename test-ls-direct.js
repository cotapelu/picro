import { createLsToolDefinition } from './dist/tools/ls.js';
import { ToolExecutor } from './dist/agent/tool-executor.js';

const executor = new ToolExecutor();
const tool = createLsToolDefinition(process.cwd());
executor.register(tool);

executor.execute(
  { id: '1', name: 'ls', arguments: {} },
  { round: 1, runtimeState: {}, signal: undefined }
).then(res => {
  console.log('Result:', JSON.stringify(res, null, 2));
}).catch(err => {
  console.error('Error:', err);
});
