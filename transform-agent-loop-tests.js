const fs = require('fs');
const path = 'src/agent/agent-loop.test.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Add Context import
if (!code.includes("import type { Context } from '../llm/index.js';")) {
  code = code.replace(
    "import type { AgentConfig, LLMResponse } from './types.js';",
    "import type { AgentConfig, LLMResponse } from './types.js';\nimport type { Context } from '../llm/index.js';"
  );
}

// 2. Insert helper functions after mockLLMProvider definition (find its end)
const mockProviderBlock = `const mockLLMProvider = async (prompt: string, tools: any[], options?: any): Promise<LLMResponse> => {
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 50));
  return {
    content: 'Mock response',
    stopReason: 'stop',
    usage: { input: 10, output: 20, totalTokens: 30, cost: { input: 0, output: 0, total: 0 } },
    toolCalls: [],
  };
};`;

const afterMockProvider = `
// Helper to create mock LLM complete function (new signature)
const createMockLLMComplete = (response: LLMResponse) => {
  return async (context: Context, options?: any): Promise<LLMResponse> => response;
};

const defaultLLMComplete = createMockLLMComplete({
  content: 'Mock response',
  stopReason: 'stop',
  usage: { input: 10, output: 20, totalTokens: 30, cost: { input: 0, output: 0, total: 0 } },
  toolCalls: [],
});

const createMockLLMStream = (chunks: string[]) => {
  return async function* (context: Context, options?: any): AsyncGenerator<any> {
    for (const chunk of chunks) {
      yield { type: 'text_delta', delta: chunk };
    }
    yield { type: 'done' };
  };
};

const defaultLLMStream = createMockLLMStream(['Hello', ' World']);
`;

// Insert after mockLLMProvider closing brace and newline(s)
const mockEndIdx = code.indexOf('};\n\n// Simple loop strategy');
if (mockEndIdx !== -1) {
  code = code.slice(0, mockEndIdx + 2) + afterMockProvider + code.slice(mockEndIdx + 2);
}

// 3. Constructor call transformations

// Pattern A: new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategyVar)
code = code.replace(
  /new AgentLoop\(config, emitter, toolExecutor, contextBuilder, ([a-zA-Z_$][\w$]*)\)/g,
  `new AgentLoop(config, emitter, toolExecutor, contextBuilder, $1, defaultLLMComplete, defaultLLMStream, undefined, [])`
);

// Pattern B: new AgentLoop with object config: new AgentLoop({ ... }, emitter, toolExecutor, contextBuilder, strategyVar)
code = code.replace(
  /new AgentLoop\(\{[\s\S]*?\},\s*emitter,\s*toolExecutor,\s*contextBuilder,\s*([a-zA-Z_$][\w$]*[^)]*)\)/g,
  (match, p1) => {
    // We want to insert before closing paren
    return `new AgentLoop(${match.split(', emitter')[0]}, emitter, toolExecutor, contextBuilder, ${p1}, defaultLLMComplete, defaultLLMStream, undefined, [])`.replace('undefined, []', 'undefined, [])');
  }
);

// But above might not work perfectly; let's simplify: match the whole and reconstruct.
// Actually we can simply ensure that after the strategy param we insert , defaultLLMComplete, defaultLLMStream, undefined, []
// We'll use a more direct approach: find occurrences of 'new AgentLoop(' that end with ')' and have exactly 5 args. But let's manually handle some specific lines? Instead we can do another pass: replace any remaining `new AgentLoop(` that does NOT already have `defaultLLMComplete` in it and has 5 args. We'll count commas.

// Simpler: After initial replacements, we will handle leftover cases manually later. For now, trust patterns cover most.

// MemoryStore patterns: 6 args where 6th is memoryStore

// Pattern: new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, memoryStore as any)
code = code.replace(
  /new AgentLoop\(config, emitter, toolExecutor, contextBuilder, ([a-zA-Z_$][\w$]*),\s*memoryStore as any\)/g,
  `new AgentLoop(config, emitter, toolExecutor, contextBuilder, $1, defaultLLMComplete, defaultLLMStream, memoryStore as any, [])`
);

// Pattern: new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, memoryStore)
code = code.replace(
  /new AgentLoop\(config, emitter, toolExecutor, contextBuilder, ([a-zA-Z_$][\w$]*),\s*memoryStore\)/g,
  `new AgentLoop(config, emitter, toolExecutor, contextBuilder, $1, defaultLLMComplete, defaultLLMStream, memoryStore, [])`
);

// 4. Run call transformations

// Simple: remove 4th arg if it's mockLLMProvider (or any of the mock provider variables) at the end of argument list
code = code.replace(/,\s*mockLLMProvider\s*\)/g, ')');
// For cases where there are more args after (like signal and initialTurns): remove the provider and shift.
code = code.replace(/(loop\.run\([^,]+,\s*[^,]+,\s*[^,]+),\s*mockLLMProvider,\s*([^,]+),\s*([^)]+)\)/g, '$1, $2, $3)');

// Also for llmProvider in signal test
code = code.replace(/,\s*llmProvider\s*\)/g, ')'); // this would affect only if 4th arg and no further args
// For the signal test with 5 args, we need to keep signal but remove provider
code = code.replace(/(loop\.run\([^,]+,\s*[^,]+,\s*[^,]+),\s*llmProvider,\s*([^,]+)\)/g, '$1, $2)');

// 5. Stream call transformations
code = code.replace(/,\s*mockStreamProvider\s*\)/g, ')');

// 6. There may be some test that uses `loop.run('test', steeringQueue, new MessageQueue(), mockLLMProvider)`, which is covered by pattern removing provider.

// 7. There is also the test where they use `loop.run('new', new MessageQueue(), new MessageQueue(), mockLLMProvider, undefined, initialTurns);`
// Already covered by the second remove pattern (with three captures) if we match the correct pattern. Let's test that pattern: we capture first three args in group1, then provider, then group2 (signal), group3 (initialTurns). Then replace with group1, group2, group3. That should work.

// 8. Also handle lines where run is called with 'mockLLMProvider' and no other args after? Already covered.

// 9. Also need to fix the "signal integration" test more comprehensively because after our generic replacement it would become:
//   await loop.run('test', new MessageQueue(), new MessageQueue(), externalSignal);
// But we also need to pass custom LLM via constructor. That test currently defines llmProvider and passes to run as 4th arg. Our generic removal will change it to `loop.run('test', new MessageQueue(), new MessageQueue(), externalSignal)`? Actually after our replace: original: `await loop.run('test', new MessageQueue(), new MessageQueue(), llmProvider, externalSignal);`
// After pattern: captures: group1 = "loop.run('test', new MessageQueue(), new MessageQueue()", group2 = externalSignal, group3 = ??? Actually our pattern for 5 args: /(loop\.run\([^,]+,\s*[^,]+,\s*[^,]+),\s*llmProvider,\s*([^,]+)\)/ matches a run with 5 args where last is something after provider. It captures group1 as everything up to the comma after third arg, group2 as the last arg. Then replace with `$1, $2)`. That yields: `loop.run('test', new MessageQueue(), new MessageQueue(), externalSignal)`. Good. But we also need to set the constructor to use a custom LLM that captures options. Currently that test's loop is created with defaultLLMComplete/Stream. That's not enough; it needs a custom llmComplete that captures options. We'll handle that manually later.

// 10. Also there is a test that uses `loop.stream` with mockStreamProvider. We removed that, fine.

// 11. There might be some uses of `loop.run` that use `mockLLMProvider` with only 3 args? Not possible.

// 12. Also need to fix the test lines where they call `loop.run` with `mockLLMProvider` and no trailing args but with a variable for second queue etc. Already covered by simple pattern that replaces ", mockLLMProvider)" with ")". This will work for any number of args as long as it's the last arg.

// Write back
fs.writeFileSync(path, code);
console.log('Transformation complete');