// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for formatSkillsForPrompt (pure function).
 */

import { describe, it, expect } from 'vitest';
import { formatSkillsForPrompt } from './skills.js';

describe('formatSkillsForPrompt', () => {
  it('returns empty string when no skills', () => {
    expect(formatSkillsForPrompt([])).toBe('');
  });

  it('filters out skills with disableModelInvocation', () => {
    const skills = [
      { name: 'a', description: 'desc a', filePath: '/a', disableModelInvocation: false } as any,
      { name: 'b', description: 'desc b', filePath: '/b', disableModelInvocation: true } as any,
    ];
    const result = formatSkillsForPrompt(skills);
    expect(result).toContain('<name>a</name>');
    expect(result).not.toContain('<name>b</name>');
  });

  it('formats XML block with all fields', () => {
    const skills = [
      { name: 'my-skill', description: 'Does something', filePath: '/path/to/SKILL.md', disableModelInvocation: false } as any,
    ];
    const result = formatSkillsForPrompt(skills);

    expect(result).toContain('<available_skills>');
    expect(result).toContain('<skill>');
    expect(result).toContain('<name>my-skill</name>');
    expect(result).toContain('<description>Does something</description>');
    expect(result).toContain('<location>/path/to/SKILL.md</location>');
    expect(result).toContain('</available_skills>');
  });

  it('includes multiple skills in order', () => {
    const skills = [
      { name: 'first', description: '1', filePath: '/1', disableModelInvocation: false } as any,
      { name: 'second', description: '2', filePath: '/2', disableModelInvocation: false } as any,
    ];
    const result = formatSkillsForPrompt(skills);
    expect(result).toMatch(/<name>first<\/name>[\s\S]*<name>second<\/name>/);
  });
});