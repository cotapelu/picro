// SPDX-License-Identifier: Apache-2.0
/**
 * System prompt construction
 */

// Placeholder paths - in a full implementation these would come from config
const DEFAULT_DOCS_PATH = "docs/";
const DEFAULT_EXAMPLES_PATH = "examples/";
const DEFAULT_README_PATH = "README.md";

/**
 * Options for building system prompt
 */
export interface BuildSystemPromptOptions {
  /** Custom system prompt (replaces default) */
  customPrompt?: string;
  /** Tools to include in prompt (default: ["read", "bash", "edit", "write"]) */
  selectedTools?: string[];
  /** One-line tool snippets keyed by tool name */
  toolSnippets?: Record<string, string>;
  /** Additional guideline bullets */
  promptGuidelines?: string[];
  /** Text to append to system prompt */
  appendSystemPrompt?: string;
  /** Working directory */
  cwd: string;
  /** Pre-loaded context files */
  contextFiles?: Array<{ path: string; content: string }>;
  /** Pre-loaded skills */
  skills?: any[]; // Skill type placeholder
}

/**
 * Format skills for prompt (simplified)
 */
function formatSkillsForPrompt(skills: any[]): string {
  if (skills.length === 0) return '';

  let result = '\n\n# Available Skills\n\n';
  for (const skill of skills) {
    const name = skill.name || skill.fileName || 'Unknown';
    result += `## ${name}\n\n${skill.description || 'No description'}\n\n`;
  }
  return result;
}

/**
 * Build the system prompt
 */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
  const {
    customPrompt,
    selectedTools,
    toolSnippets,
    promptGuidelines,
    appendSystemPrompt,
    cwd,
    contextFiles = [],
    skills = [],
  } = options;

  const promptCwd = cwd.replace(/\\/g, '/');

  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const appendSection = appendSystemPrompt ? `\n\n${appendSystemPrompt}` : '';

  // If custom prompt provided, use it as base
  if (customPrompt) {
    let prompt = customPrompt;

    if (appendSection) {
      prompt += appendSection;
    }

    // Append project context files
    if (contextFiles.length > 0) {
      prompt += '\n\n# Project Context\n\n';
      prompt += 'Project-specific instructions and guidelines:\n\n';
      for (const { path: filePath, content } of contextFiles) {
        prompt += `## ${filePath}\n\n${content}\n\n`;
      }
    }

    // Append skills
    if (skills.length > 0) {
      prompt += formatSkillsForPrompt(skills);
    }

    // Add date and cwd
    prompt += `\nCurrent date: ${date}`;
    prompt += `\nCurrent working directory: ${promptCwd}`;

    return prompt;
  }

  // Build default system prompt
  const tools = selectedTools || ['read', 'bash', 'edit', 'write'];
  const visibleTools = toolSnippets
    ? tools.filter((name) => !!toolSnippets[name])
    : tools;

  const toolsList = visibleTools.length > 0
    ? visibleTools.map((name) => `- ${name}: ${toolSnippets?.[name] || '(no description)'}`).join('\n')
    : '(none)';

  // Build guidelines
  const guidelinesSet = new Set<string>();
  const addGuideline = (g: string) => {
    if (g.trim().length > 0) guidelinesSet.add(g.trim());
  };

  const hasBash = tools.includes('bash');
  const hasGrep = tools.includes('grep');
  const hasFind = tools.includes('find');
  const hasLs = tools.includes('ls');
  const hasRead = tools.includes('read');

  if (hasBash && !hasGrep && !hasFind && !hasLs) {
    addGuideline('Use bash for file operations like ls, rg, find');
  } else if (hasBash && (hasGrep || hasFind || hasLs)) {
    addGuideline('Prefer grep/find/ls tools over bash for file exploration (faster, respects .gitignore)');
  }

  for (const guideline of promptGuidelines ?? []) {
    addGuideline(guideline);
  }

  addGuideline('Be concise in your responses');
  addGuideline('Show file paths clearly when working with files');

  const guidelines = Array.from(guidelinesSet).map((g) => `- ${g}`).join('\n');

  const readmePath = DEFAULT_README_PATH;
  const docsPath = DEFAULT_DOCS_PATH;
  const examplesPath = DEFAULT_EXAMPLES_PATH;

  let prompt = `You are an expert coding assistant operating inside pi, a coding agent harness. You help users by reading files, executing commands, editing code, and writing new files.

Available tools:
${toolsList}

In addition to the tools above, you may have access to other custom tools depending on the project.

Guidelines:
${guidelines}

Pi documentation (read only when the user asks about pi itself, its SDK, extensions, themes, skills, or TUI):
- Main documentation: ${readmePath}
- Additional docs: ${docsPath}
- Examples: ${examplesPath}
- When asked about: extensions, themes, skills, prompt templates, TUI components, keybindings, SDK integrations, custom providers, adding models, pi packages
- When working on pi topics, read the docs and examples, and follow .md cross-references before implementing
- Always read pi .md files completely and follow links to related docs`;

  if (appendSection) {
    prompt += appendSection;
  }

  // Append project context files
  if (contextFiles.length > 0) {
    prompt += '\n\n# Project Context\n\n';
    prompt += 'Project-specific instructions and guidelines:\n\n';
    for (const { path: filePath, content } of contextFiles) {
      prompt += `## ${filePath}\n\n${content}\n\n`;
    }
  }

  // Append skills
  if (hasRead && skills.length > 0) {
    prompt += formatSkillsForPrompt(skills);
  }

  // Add date and working directory last
  prompt += `\nCurrent date: ${date}`;
  prompt += `\nCurrent working directory: ${promptCwd}`;

  return prompt;
}
