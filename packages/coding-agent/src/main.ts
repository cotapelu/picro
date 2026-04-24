#!/usr/bin/env node
/**
 * Coding Agent - Main Entry Point
 * 
 * Refactored to use @autoresearch packages:
 * - @picro/agent - Core agent logic
 * - @picro/llm - LLM calls
 * - @picro/memory - Memory system
 * - @picro/tui - Terminal UI
 */

import { Command } from 'commander';
import { ConfigManager } from './config/config.js';
import { Agent, type ToolDefinition, type AIModel } from '@picro/agent';
import { createLLMInstance } from './llm-adapter.js';
import { getModel, getProviders, getModels, stream } from '@picro/llm';
import { AgentMemoryApp, MemoryStore } from '@picro/memory';
import { startTUIMode } from './tui-app.js';
import { createMemoryStoreAdapter } from './memory-store-adapter.js';

// Import tool classes
import { FileTools } from './tools/file-tools.js';
import { CodeTools } from './tools/code-tools.js';
import { CommandTools } from './tools/command-tools.js';
import { SearchTools } from './tools/search-tools.js';

// Initialize tool instances
const fileTools = new FileTools();
const codeTools = new CodeTools();
const commandTools = new CommandTools();
const searchTools = new SearchTools();

// Get all tool definitions
function getTools(): ToolDefinition[] {
  return [
    ...fileTools.getTools(),
    ...codeTools.getTools(),
    ...commandTools.getTools(),
    ...searchTools.getTools(),
  ];
}

export { getTools };

// ============================================================================
// LLM Wrapper - adapts @picro/llm to @picro/agent
// ============================================================================
// Startup
// ============================================================================

const startTime = Date.now();
console.log('🤖 Coding Agent starting...');

// ============================================================================
// CLI Configuration
// ============================================================================

const program = new Command();

program
  .name('coding-agent')
  .description('AI-powered coding assistant using @autoresearch packages')
  .version('1.0.0');

// Global options
program
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--no-color', 'Disable colored output')
  .option('-p, --project <name>', 'Project name')
  .option('--provider <provider>', 'LLM provider')
  .option('--model <model>', 'Model name');

// ============================================================================
// Run Mode (single prompt)
// ============================================================================

program
  .command('run')
  .description('Run agent with a single prompt')
  .argument('<prompt>', 'The prompt to process')
  .option('--strategy <strategy>', 'Agent strategy (react, plan-solve, reflection, simple)', 'react')
  .option('--max-rounds <number>', 'Maximum rounds', '10')
  .action(async (prompt, options) => {
    const config = ConfigManager.getInstance();
    
    // Get model from @picro/llm
    const provider = config.getCurrentProvider();
    const modelName = config.getCurrentModel();
    const modelDef = getModel(provider, modelName);
    
    if (!modelDef) {
      console.error(`Error: Model ${provider}/${modelName} not found`);
      console.log('Run: coding-agent config list');
      process.exit(1);
    }
    
    // Create LLMInstance using agent helper
    const llm = createLLMInstance(modelDef);
    
    // Initialize memory from @picro/memory
    const store = new MemoryStore('./.coding-agent/memory.json');
    const memory = new AgentMemoryApp(store);
    
    // Get tools from tool classes
    const agentTools = getTools();
    
    // Create an AIModel object from the model definition
    const aiModel: AIModel = {
      id: modelDef.id,
      name: modelDef.name || modelDef.id,
      api: modelDef.api || 'unknown',
      provider: modelDef.provider || 'unknown',
      baseUrl: modelDef.baseUrl,
      reasoning: modelDef.reasoning ?? false,
      contextWindow: modelDef.contextWindow ?? 32768,
      maxTokens: modelDef.maxTokens ?? 4096,
      inputCost: modelDef.cost.input,
      outputCost: modelDef.cost.output,
      cacheReadCost: modelDef.cost.cacheRead,
      cacheWriteCost: modelDef.cost.cacheWrite,
    };
    
    // Create agent from @picro/agent
    const agent = new Agent(aiModel, agentTools, {
      maxRounds: parseInt(options.maxRounds),
      loopStrategy: options.strategy as any,
      memoryStore: createMemoryStoreAdapter(memory),
    });
    
    // Set the LLM provider and stream provider
    const llmInstance = createLLMInstance(modelDef);
    agent.setLLMProvider(llmInstance.chatWithTools.bind(llmInstance));
    agent.setStreamProvider((prompt: string, tools: any[], options?: any) => {
      return stream(modelDef, { 
        messages: [{ role: 'user' as const, content: prompt, timestamp: Date.now() }],
        tools: tools
      }, options);
    });
    
    console.log(`\n🤔 Processing: "${prompt}"`);
    
    // Run agent
    const result = await agent.run(prompt);
    
    console.log('\n✅ Result:');
    console.log(result.finalAnswer);
    console.log(`\nRounds: ${result.totalRounds}`);
    console.log(`Success: ${result.success}`);
  });

// ============================================================================
// Interactive Mode
// ============================================================================

program
  .command('interactive')
  .alias('i')
  .description('Start interactive TUI mode')
  .action(async (options) => {
    // Apply debug flag from CLI
    if (options.debug) {
      const config = ConfigManager.getInstance();
      config.updateSettings({ debugMode: true });
    }
    await startInteractiveMode();
  });

// Config commands removed - will be reimplemented in TUI settings.


// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    const args = process.argv.slice(2);
    // If help or version flags are present, let commander handle them
    const helpOrVersion = args.some(arg => arg === '--help' || arg === '-h' || arg === '--version' || arg === '-V');
    if (helpOrVersion) {
      await program.parseAsync(process.argv);
      return;
    }
    // If no command provided, start interactive mode
    const hasCommand = args.length > 0 && !args[0].startsWith('-');
    if (!hasCommand) {
      await startInteractiveMode();
      return;
    }
    await program.parseAsync(process.argv);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// Interactive Mode
// ============================================================================

async function startInteractiveMode() {
  await startTUIMode();
}

main();