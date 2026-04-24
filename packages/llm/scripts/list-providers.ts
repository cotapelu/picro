#!/usr/bin/env tsx

/**
 * List all providers from models.dev API
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function listProviders() {
  try {
    console.log('Fetching providers from models.dev...\n');
    const response = await fetch('https://models.dev/api.json');
    const data = await response.json();

    const providers = Object.keys(data).filter(key => {
      const val = data[key];
      return val && typeof val === 'object' && val.models;
    });

    console.log(`Found ${providers.length} providers:\n`);

    for (const provider of providers.sort()) {
      const models = data[provider].models;
      const modelCount = Object.keys(models).length;
      console.log(`- ${provider}: ${modelCount} models`);

      // Show sample model IDs (first 3)
      const sampleIds = Object.keys(models).slice(0, 3);
      for (const id of sampleIds) {
        console.log(`    • ${id}`);
      }
      if (modelCount > 3) {
        console.log(`    ... and ${modelCount - 3} more`);
      }
      console.log('');
    }

    // Also check for tool_call support
    console.log('=== Tool Call Support Summary ===\n');
    for (const provider of providers.sort()) {
      const models = data[provider].models;
      const toolCallModels = Object.entries(models).filter(([_, m]: [string, any]) => m.tool_call === true).length;
      const totalModels = Object.keys(models).length;

      if (toolCallModels > 0) {
        console.log(`${provider}: ${toolCallModels}/${totalModels} models support tools`);
      }
    }

  } catch (error) {
    console.error('Failed:', error);
  }
}

listProviders();
