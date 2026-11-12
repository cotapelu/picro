// SPDX-License-Identifier: Apache-2.0
/**
 * System prompt skills section.
 *
 * buildSystemPrompt() used a formatter whose parameter shape had no
 * disableModelInvocation field, so skills that opted out of model invocation were
 * still advertised in the system prompt (the model would invoke them). The
 * filtering formatter in skills.ts was dead code on this path.
 */

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, formatSkillsForPrompt } from './system-prompt.js';

const cwd = '/tmp/project';

function promptWith(skills: any[]) {
  return buildSystemPrompt({
    cwd,
    selectedTools: ['read'],
    toolSnippets: { read: 'read a file' },
    skills,
  });
}

describe('buildSystemPrompt - skills section', () => {
  it('includes ordinary skills', () => {
    const prompt = promptWith([
      { name: 'alpha', description: 'does alpha', filePath: '/a/SKILL.md' },
    ]);
    expect(prompt).toContain('## alpha');
    expect(prompt).toContain('does alpha');
    expect(prompt).toContain('/a/SKILL.md');
  });

  it('omits skills that disable model invocation', () => {
    const prompt = promptWith([
      { name: 'visible', description: 'shown', filePath: '/v/SKILL.md' },
      { name: 'hidden', description: 'never shown', filePath: '/h/SKILL.md', disableModelInvocation: true },
    ]);
    expect(prompt).toContain('## visible');
    expect(prompt).not.toContain('## hidden');
    expect(prompt).not.toContain('never shown');
  });

  it('emits no skills section when every skill is disabled', () => {
    const prompt = promptWith([
      { name: 'hidden', description: 'never shown', filePath: '/h/SKILL.md', disableModelInvocation: true },
    ]);
    expect(prompt).not.toContain('Available Skills');
    expect(prompt).not.toContain('never shown');
  });

  it('keeps skills in the custom-prompt branch filtered too', () => {
    const prompt = buildSystemPrompt({
      cwd,
      customPrompt: 'You are custom.',
      selectedTools: ['read'],
      skills: [
        { name: 'visible', description: 'shown', filePath: '/v/SKILL.md' },
        { name: 'hidden', description: 'never shown', filePath: '/h/SKILL.md', disableModelInvocation: true },
      ],
    });
    expect(prompt).toContain('## visible');
    expect(prompt).not.toContain('never shown');
  });
});

describe('formatSkillsForPrompt', () => {
  it('returns an empty string for an empty list', () => {
    expect(formatSkillsForPrompt([])).toBe('');
  });

  it('returns an empty string when all skills are disabled', () => {
    expect(
      formatSkillsForPrompt([
        { name: 'hidden', description: 'x', filePath: '/h/SKILL.md', disableModelInvocation: true },
      ]),
    ).toBe('');
  });
});
