/**
 * Simple test to verify the extension works with pi-ai
 *
 * Usage:
 *   npx tsx test-extension.ts
 *
 * Set NVIDIA_NIM_API_KEY environment variable to test with real API.
 */

import { getModel, stream } from '@mariozechner/pi-ai/dist/index.js';
import { MODELS } from './dist/src/models.generated.js';

async function test() {
  console.log('=== Testing @picro/llm Extension ===\n');

  // Test 1: MODELS object is available
  console.log('✅ MODELS exported successfully');
  console.log(`   Providers: ${Object.keys(MODELS).join(', ')}`);
  console.log(`   NVIDIA NIM models: ${Object.keys(MODELS['nvidia-nim'] || {}).length}`);
  console.log(`   OpenCode models: ${Object.keys(MODELS['opencode'] || {}).length}\n`);

  // Test 2: getModel works
  const model = getModel('nvidia-nim', 'stepfun-ai/step-3.5-flash');
  console.log('✅ getModel() works:', model.id, model.api, model.baseUrl);
  console.log(`   Compat flags: ${JSON.stringify(model.compat || {})}\n`);

  // Test 3: Try streaming if API key is available
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    console.log('⚠️  No NVIDIA_NIM_API_KEY set. Skipping live API test.');
    console.log('   To test with real API:\n     export NVIDIA_NIM_API_KEY=your_key\n     npx tsx test-extension.ts\n');
    return;
  }

  console.log('✅ API key found, testing live stream...\n');

  const context = {
    messages: [
      {
        role: 'user',
        content: 'Say "Hello from NVIDIA NIM via pi-ai extension!" in exactly 5 words.',
        timestamp: Date.now(),
      },
    ],
  };

  try {
    const streamResult = stream(model, context, { apiKey });
    let fullResponse = '';

    for await (const event of streamResult) {
      if (event.type === 'text_delta') {
        process.stdout.write(event.delta);
        fullResponse += event.delta;
      }
      if (event.type === 'done') {
        console.log('\n✅ Stream completed with reason:', event.reason);
      }
      if (event.type === 'error') {
        console.error('\n❌ Stream error:', event.error.errorMessage);
      }
    }

    const result = await streamResult.result();
    console.log('\n✅ Final message:', {
      stopReason: result.stopReason,
      usage: result.usage.totalTokens + ' tokens',
      cost: '$' + result.usage.cost.total.toFixed(6),
    });

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

test().catch(console.error);
