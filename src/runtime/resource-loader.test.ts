// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for DefaultResourceLoader.
 */

import { describe, it, expect } from 'vitest';
import { DefaultResourceLoader } from './resource-loader';
import { join } from 'path';
import { tmpdir } from 'os';

describe('DefaultResourceLoader', () => {
  it('should instantiate and return empty resources by default', () => {
    const testCwd = join(tmpdir(), `test-${Date.now()}`);
    const loader = new DefaultResourceLoader({
      cwd: testCwd,
      agentDir: join(tmpdir(), 'agent'),
    });

    const skills = loader.getSkills();
    expect(skills.skills).toBeInstanceOf(Array);
    expect(skills.diagnostics).toBeInstanceOf(Array);

    const prompts = loader.getPrompts();
    expect(prompts.prompts).toBeInstanceOf(Array);

    const agentsFiles = loader.getAgentsFiles();
    expect(agentsFiles.agentsFiles).toBeInstanceOf(Array);
  });

  it('should be able to reload without throwing', async () => {
    const testCwd = join(tmpdir(), `test-${Date.now()}`);
    const loader = new DefaultResourceLoader({
      cwd: testCwd,
      agentDir: join(tmpdir(), 'agent'),
    });

    // Should not throw
    await loader.reload();
  });
});
