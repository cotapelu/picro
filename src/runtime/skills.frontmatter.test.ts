// SPDX-License-Identifier: Apache-2.0
/**
 * SKILL.md frontmatter parsing.
 *
 * The old parser used /^---\n([\s\S]*?)\n---\n([\s\S]*)$/ and split "key: value"
 * lines by hand, so a SKILL.md written on Windows (CRLF), saved with a UTF-8 BOM,
 * or saved without a trailing newline after the closing fence lost its entire
 * frontmatter and was then dropped for having no description. Multi-line
 * descriptions collapsed to the block-scalar marker ("|").
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSkillFromFile, loadSkillsFromDir } from './skills.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'picro-skill-'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

function writeSkill(content: string, name = 'my-skill'): string {
  const skillDir = join(dir, name);
  mkdirSync(skillDir, { recursive: true });
  const filePath = join(skillDir, 'SKILL.md');
  writeFileSync(filePath, content);
  return filePath;
}

describe('SKILL.md frontmatter', () => {
  it('parses a normal LF file', () => {
    const path = writeSkill('---\nname: my-skill\ndescription: does things\n---\nbody\n');
    expect(loadSkillFromFile(path)).toMatchObject({
      name: 'my-skill',
      description: 'does things',
    });
  });

  it('parses a file whose closing fence ends at EOF (no trailing newline)', () => {
    const path = writeSkill('---\nname: my-skill\ndescription: does things\n---');
    expect(loadSkillFromFile(path)?.description).toBe('does things');
  });

  it('parses a CRLF file', () => {
    const path = writeSkill('---\r\nname: my-skill\r\ndescription: does things\r\n---\r\nbody\r\n');
    expect(loadSkillFromFile(path)?.description).toBe('does things');
  });

  it('parses a file with a UTF-8 BOM', () => {
    const path = writeSkill('\uFEFF---\nname: my-skill\ndescription: does things\n---\n');
    expect(loadSkillFromFile(path)?.name).toBe('my-skill');
  });

  it('keeps a multi-line (block scalar) description', () => {
    const path = writeSkill('---\nname: my-skill\ndescription: |\n  line one\n  line two\n---\n');
    expect(loadSkillFromFile(path)?.description).toBe('line one\nline two');
  });

  it('keeps colons inside the value', () => {
    const path = writeSkill('---\nname: my-skill\ndescription: Use this: when needed\n---\n');
    expect(loadSkillFromFile(path)?.description).toBe('Use this: when needed');
  });

  it('strips surrounding quotes', () => {
    const path = writeSkill('---\nname: my-skill\ndescription: "quoted value"\n---\n');
    expect(loadSkillFromFile(path)?.description).toBe('quoted value');
  });

  it('reads disable-model-invocation as a boolean', () => {
    const path = writeSkill('---\nname: my-skill\ndescription: d\ndisable-model-invocation: true\n---\n');
    expect(loadSkillFromFile(path)?.disableModelInvocation).toBe(true);

    const other = writeSkill('---\nname: my-skill\ndescription: d\ndisable-model-invocation: false\n---\n', 'other-name');
    expect(loadSkillFromFile(other)?.disableModelInvocation).toBe(false);
  });

  it('falls back to the parent directory name when frontmatter has none', () => {
    const path = writeSkill('---\ndescription: d\n---\n');
    expect(loadSkillFromFile(path)?.name).toBe('my-skill');
  });

  it('treats a file without frontmatter as having none', () => {
    const path = writeSkill('just a body\n');
    // No description anywhere -> rejected, but must not throw.
    expect(loadSkillFromFile(path)).toBeNull();
  });
});

describe('SKILL.md validation', () => {
  it('rejects names with consecutive hyphens', () => {
    const path = writeSkill('---\nname: my--skill\ndescription: d\n---\n');
    expect(loadSkillFromFile(path)).toBeNull();
  });

  it('rejects names with a leading or trailing hyphen', () => {
    expect(loadSkillFromFile(writeSkill('---\nname: -skill\ndescription: d\n---\n'))).toBeNull();
    expect(loadSkillFromFile(writeSkill('---\nname: skill-\ndescription: d\n---\n'))).toBeNull();
  });

  it('rejects an over-long description', () => {
    const long = 'x'.repeat(1025);
    const path = writeSkill(`---\nname: my-skill\ndescription: ${long}\n---\n`);
    expect(loadSkillFromFile(path)).toBeNull();
  });

  it('accepts a description at the length limit', () => {
    const limit = 'x'.repeat(1024);
    const path = writeSkill(`---\nname: my-skill\ndescription: ${limit}\n---\n`);
    expect(loadSkillFromFile(path)?.description).toHaveLength(1024);
  });

  it('discovers skills through loadSkillsFromDir', () => {
    writeSkill('---\nname: alpha\ndescription: a\n---\n', 'alpha');
    writeSkill('---\nname: beta\ndescription: b\n---\n', 'beta');
    const skills = loadSkillsFromDir(dir);
    expect(skills.map((s) => s.name).sort()).toEqual(['alpha', 'beta']);
  });
});
