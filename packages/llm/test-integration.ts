import { getModel, getProviders, getModels } from './dist/src/index.js';
import { MODELS } from './dist/src/models.generated.js';

console.log('=== Testing @picro/llm Integration ===\n');

// Test 1: Providers
const providers = getProviders();
console.log('✅ getProviders():', providers.length, 'providers');

// Test 2: NVIDIA NIM models
const nvidiaModels = getModels('nvidia-nim');
console.log('\n✅ getModels("nvidia-nim"):', nvidiaModels.length, 'models');
console.log('   Sample:', nvidiaModels[0]?.id, nvidiaModels[0]?.api, nvidiaModels[0]?.baseUrl);

// Test 3: getModel specific
const model = getModel('nvidia-nim', 'stepfun-ai/step-3.5-flash');
console.log('\n✅ getModel("nvidia-nim", "stepfun-ai/step-3.5-flash"):');
console.log('   Model:', model?.id, model?.api);
console.log('   Compat:', model?.compat);

// Test 4: MODELS direct
console.log('\n✅ MODELS direct:');
console.log('   NVIDIA in MODELS:', Object.keys(MODELS).includes('nvidia-nim'));
console.log('   NVIDIA model count:', Object.keys(MODELS['nvidia-nim'] || {}).length);

// Test 5: Consistency
const directModel = MODELS['nvidia-nim']['stepfun-ai/step-3.5-flash'];
const getModelResult = getModel('nvidia-nim', 'stepfun-ai/step-3.5-flash');
console.log('\n✅ Consistency:');
console.log('   getModel() === MODELS[]:', getModelResult?.id === directModel?.id);

console.log('\n=== All tests passed! ===');
