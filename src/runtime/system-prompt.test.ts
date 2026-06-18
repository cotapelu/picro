import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './system-prompt.js';

describe('buildSystemPrompt', () => {
  it('builds default prompt without customPrompt', () => {
    const prompt = buildSystemPrompt({
      cwd: '/home/user/project',
      toolSnippets: {
        read: 'Read file contents',
        bash: 'Execute bash commands',
      },
      selectedTools: ['read', 'bash', 'edit', 'write'],
      promptGuidelines: [],
    });
    expect(prompt).toContain('You are an expert coding assistant');
    expect(prompt).toContain('Available tools:');
    expect(prompt).toContain('- read: Read file contents');
    expect(prompt).toContain('- bash: Execute bash commands');
    expect(prompt).toContain('Current date:');
    expect(prompt).toContain('Current working directory: /home/user/project');
  });

  it('includes context files when provided', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      toolSnippets: {},
      selectedTools: [],
      contextFiles: [
        { path: 'README.md', content: '# Project' },
        { path: 'AGENTS.md', content: 'Instructions' },
      ],
    });
    // XML format for project context
    expect(prompt).toContain('<project_context>');
    expect(prompt).toContain('Project-specific instructions and guidelines:');
    expect(prompt).toContain('<project_instructions path="README.md">');
    expect(prompt).toContain('# Project'); // content
    expect(prompt).toContain('<project_instructions path="AGENTS.md">');
    expect(prompt).toContain('Instructions');
    expect(prompt).toContain('</project_context>');
  });

  it('includes skills when provided', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      toolSnippets: {},
      selectedTools: [],
      skills: [
        { name: 'test-skill', description: 'Does testing', filePath: '/skills/test' },
      ],
    });
    expect(prompt).toContain('# Available Skills');
    expect(prompt).toContain('## test-skill');
    expect(prompt).toContain('Does testing');
  });

  it('handles customPrompt with append and context', () => {
    const prompt = buildSystemPrompt({
      customPrompt: 'You are a custom assistant.',
      cwd: '/custom',
      appendSystemPrompt: 'Be extra helpful.',
      contextFiles: [{ path: 'file.txt', content: 'data' }],
    });
    expect(prompt).toContain('You are a custom assistant.');
    expect(prompt).toContain('Be extra helpful.');
    // XML format for project context
    expect(prompt).toContain('<project_context>');
    expect(prompt).toContain('<project_instructions path="file.txt">');
    expect(prompt).toContain('data');
    expect(prompt).toContain('</project_context>');
  });

  it('does not show empty tools list when no snippets', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      toolSnippets: {},
      selectedTools: ['read', 'bash'],
    });
    expect(prompt).toContain('Available tools:\n(none)');
  });

  it('filters tools without snippets', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      toolSnippets: {
        read: 'Read files',
        edit: 'Edit files',
      },
      selectedTools: ['read', 'bash', 'edit', 'write'],
    });
    // Only tools with snippets should appear in the list
    expect(prompt).toContain('Available tools:');
    expect(prompt).toContain('- read: Read files');
    expect(prompt).toContain('- edit: Edit files');
    // Ensure non-snippet tools are not listed as tool entries (no "- bash:" line)
    expect(prompt).not.toMatch(/^- bash:/m);
    expect(prompt).not.toMatch(/^- write:/m);
  });

  it('includes promptGuidelines without duplicates', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      toolSnippets: {},
      selectedTools: [],
      promptGuidelines: [
        'Be concise in your responses',
        'Show file paths clearly when working with files',
        'Be concise in your responses', // duplicate
      ],
    });
    const guidelinesSection = prompt.match(/Guidelines:\n([\s\S]*?)\n\n/)?.[1] || '';
    expect(guidelinesSection).toContain('Be concise in your responses');
    // Should appear only once
    expect(guidelinesSection.split('Be concise in your responses').length - 1).toBe(1);
    expect(guidelinesSection).toContain('Show file paths clearly when working with files');
  });

  it('adds default guideline when only bash tools selected (no grep/find/ls)', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      toolSnippets: { bash: 'Execute commands' },
      selectedTools: ['bash'],
    });
    expect(prompt).toContain('Use bash for file operations like ls, rg, find');
  });

  it('prefers grep/find/ls when available alongside bash', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      toolSnippets: { bash: 'Execute', grep: 'Search' },
      selectedTools: ['bash', 'grep', 'ls'],
    });
    expect(prompt).toContain('Prefer grep/find/ls tools over bash');
  });

  it('formats date correctly', () => {
    const now = new Date('2025-05-28T12:00:00Z');
    const prompt = buildSystemPrompt({ cwd: '/', toolSnippets: {}, selectedTools: [] });
    // Since it uses current date, we cannot assert exact value but can check format YYYY-MM-DD
    const dateMatch = prompt.match(/Current date: (\d{4}-\d{2}-\d{2})/);
    expect(dateMatch).not.toBeNull();
  });

  it('normalizes Windows paths in cwd', () => {
    // Simulate Windows path with backslashes
    const cwd = 'C:\\Users\\test\\project';
    const prompt = buildSystemPrompt({
      cwd,
      toolSnippets: {},
      selectedTools: [],
    });
    expect(prompt).toContain('Current working directory: C:/Users/test/project');
  });

  it('includes tool snippets for all selected tools that have snippets', () => {
    const prompt = buildSystemPrompt({
      cwd: '/',
      toolSnippets: {
        read: 'Read',
        write: 'Write',
      },
      selectedTools: ['read', 'write', 'edit'],
    });
    expect(prompt).toContain('- read: Read');
    expect(prompt).toContain('- write: Write');
    // edit has no snippet -> omitted
    expect(prompt).not.toContain('edit:');
  });
});
