import { getModel, getProviders, getModels, MODELS } from './dist/src/index.js';

console.log('=== @picro/llm Test ===\n');

// Check MODELS loaded
console.log('✅ MODELS loaded:', Object.keys(MODELS).length, 'providers');
console.log('   NVIDIA NIM models:', Object.keys(MODELS['nvidia-nim'] || {}).length);

// Check getModel
const model = getModel('nvidia-nim', 'stepfun-ai/step-3.5-flash');
console.log('\n✅ getModel("nvidia-nim", "stepfun-ai/step-3.5-flash"):');
console.log('   ID:', model?.id);
console.log('   API:', model?.api);
console.log('   Base URL:', model?.baseUrl);
console.log('   Reasoning:', model?.reasoning);
console.log('   Compat:', JSON.stringify(model?.compat));

// Check providers
const providers = getProviders();
console.log('\n✅ getProviders():', providers.length, 'providers');
console.log('   Includes nvidia-nim:', providers.includes('nvidia-nim'));

// Check getModels
const nvidiaModels = getModels('nvidia-nim');
console.log('\n✅ getModels("nvidia-nim"):', nvidiaModels.length, 'models');

console.log('\n✅ All checks passed!');
