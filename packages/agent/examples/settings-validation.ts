// Settings Validation Example
//
// Shows how to validate settings before saving.

import { validateSettings, validateOrThrow } from '@picro/agent';

const userSettings = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-4',
  steeringMode: 'one-at-a-time',
  compaction: {
    enabled: true,
    reserveTokens: 20000,
  },
  // intentionally missing required fields or invalid values will cause errors
};

// Validate and get errors
const errors = validateSettings(userSettings);
if (errors.length > 0) {
  console.log('Validation errors:');
  for (const err of errors) {
    console.log(`  ${err.field}: ${err.message}`);
  }
} else {
  console.log('Settings are valid!');
}

// Or throw on invalid
try {
  validateOrThrow(userSettings);
  console.log('Settings passed validation');
} catch (e) {
  console.error('Invalid settings:', e);
}
