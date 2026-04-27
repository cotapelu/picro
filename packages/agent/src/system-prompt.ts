// SPDX-License-Identifier: Apache-2.0
/**
 * System Prompt Builder - Build system prompt with tools, guidelines, and context
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - Tool selection and documentation
 * - Guideline generation based on available tools
 * - Context file embedding
 * - Skill formatting
 */

import { join } from "node:path";

import { formatSkillsForPrompt, type Skill } from "./skills.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for building system prompt
 */
export interface BuildSystemPromptOptions {
  /** Custom system prompt (replaces default) */
  customPrompt?: string;
  /** Tools to include in prompt. Default: [read, bash, edit, write] */
  selectedTools?: string[];
  /** Optional one-line tool snippets keyed by tool name */
  toolSnippets?: Record<string, string>;
  /** Additional guideline bullets */
  promptGuidelines?: string[];
  /** Text to append to system prompt */
  appendSystemPrompt?: string;
  /** Working directory */
  cwd: string;
  /** Agent package directory (for docs path) */
  agentDir: string;
  /** Pre-loaded context files */
  contextFiles?: Array<{ path: string; content: string }>;
  /** Pre-loaded skills */
  skills?: Skill[];
}

// ============================================================================
// Path Helpers
// ============================================================================

function getDocsPath(agentDir: string): string {
  return join(agentDir, "docs");
}

function getReadmePath(agentDir: string): string {
  return join(agentDir, "README.md");
}

function getExamplesPath(agentDir: string): string {
  return join(agentDir, "examples");
}

// ============================================================================
// Guideline Helpers
// ============================================================================

interface GuidelineSet {
  add: (guideline: string) => void;
  has: (guideline: string) => boolean;
}

function createGuidelineSet(): GuidelineSet {
  const set = new Set<string>();
  return {
    add: (g) => set.add(g),
    has: (g) => set.has(g),
  };
}

// ============================================================================
// Prompt Building
// ============================================================================

/**
 * Build the system prompt with tools, guidelines, and context
 */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
  const {
    customPrompt,
    selectedTools,
    toolSnippets,
    promptGuidelines,
    appendSystemPrompt,
    cwd,
    agentDir,
    contextFiles: providedContextFiles = [],
    skills: providedSkills = [],
  } = options;

  const promptCwd = cwd.replace(/\\/g, "/");

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  const appendSection = appendSystemPrompt ? `\n\n${appendSystemPrompt}` : "";

  const docsPath = getDocsPath(agentDir);
  const readmePath = getReadmePath(agentDir);
  const examplesPath = getExamplesPath(agentDir);

  // Handle custom prompt mode
  if (customPrompt) {
    let prompt = customPrompt;

    if (appendSection) {
      prompt += appendSection;
    }

    // Append project context files
    if (providedContextFiles.length > 0) {
      prompt += "\n\n# Project Context\n\n";
      prompt += "Project-specific instructions and guidelines:\n\n";
      for (const { path: filePath, content } of providedContextFiles) {
        prompt += `## ${filePath}\n\n${content}\n\n`;
      }
    }

    // Append skills section (only if read tool is available)
    const customPromptHasRead = !selectedTools || selectedTools.includes("read");
    if (customPromptHasRead && providedSkills.length > 0) {
      prompt += formatSkillsForPrompt(providedSkills);
    }

    // Add date and working directory last
    prompt += `\nCurrent date: ${dateStr}`;
    prompt += `\nCurrent working directory: ${promptCwd}`;

    return prompt;
  }

  // Build tools list based on selected tools
  const tools = selectedTools || ["read", "bash", "edit", "write"];
  const visibleTools = tools.filter((name) => !!toolSnippets?.[name]);
  const toolsList =
    visibleTools.length > 0
      ? visibleTools
          .map((name) => `- ${name}: ${toolSnippets![name]}`)
          .join("\n")
      : "(none)";

  // Build guidelines based on available tools
  const guidelinesSet = createGuidelineSet();
  const guidelinesList: string[] = [];

  const addGuideline = (guideline: string): void => {
    if (guidelinesSet.has(guideline)) {
      return;
    }
    guidelinesSet.add(guideline);
    guidelinesList.push(guideline);
  };

  const hasBash = tools.includes("bash");
  const hasGrep = tools.includes("grep");
  const hasFind = tools.includes("find");
  const hasLs = tools.includes("ls");
  const hasRead = tools.includes("read");

  // File exploration guidelines
  if (hasBash && !hasGrep && !hasFind && !hasLs) {
    addGuideline("Use bash for file operations like ls, rg, find");
  } else if (hasBash && (hasGrep || hasFind || hasLs)) {
    addGuideline(
      "Prefer grep/find/ls tools over bash for file exploration (faster, respects .gitignore)"
    );
  }

  // Custom guidelines
  for (const guideline of promptGuidelines ?? []) {
    const normalized = guideline.trim();
    if (normalized.length > 0) {
      addGuideline(normalized);
    }
  }

  // Always include these
  addGuideline("Be concise in your responses");
  addGuideline("Show file paths clearly when working with files");

  const guidelines = guidelinesList.map((g) => `- ${g}`).join("\n");

  let prompt = `You are an expert coding assistant operating inside pi, a coding agent harness. You help users by reading files, executing commands, editing code, and writing new files.

Available tools:
${toolsList}

In addition to the tools above, you may have access to other custom tools depending on the project.

Guidelines:
${guidelines}

Pi documentation (read only when the user asks about pi itself, its SDK, extensions, themes, skills, or TUI):
- Main documentation: ${readmePath}
- Additional docs: ${docsPath}
- Examples: ${examplesPath} (extensions, custom tools, SDK)
- When asked about: extensions (docs/extensions.md, examples/extensions/), themes (docs/themes.md), skills (docs/skills.md), prompt templates (docs/prompt-templates.md), TUI components (docs/tui.md), keybindings (docs/keybindings.md), SDK integrations (docs/sdk.md), custom providers (docs/custom-provider.md), adding models (docs/models.md), pi packages (docs/packages.md)
- When working on pi topics, read the docs and examples, and follow .md cross-references before implementing
- Always read pi .md files completely and follow links to related docs (e.g., tui.md for TUI API details)`;

  if (appendSection) {
    prompt += appendSection;
  }

  // Append project context files
  if (providedContextFiles.length > 0) {
    prompt += "\n\n# Project Context\n\n";
    prompt += "Project-specific instructions and guidelines:\n\n";
    for (const { path: filePath, content } of providedContextFiles) {
      prompt += `## ${filePath}\n\n${content}\n\n`;
    }
  }

  // Append skills section (only if read tool is available)
  if (hasRead && providedSkills.length > 0) {
    prompt += formatSkillsForPrompt(providedSkills);
  }

  // Add date and working directory last
  prompt += `\nCurrent date: ${dateStr}`;
  prompt += `\nCurrent working directory: ${promptCwd}`;

  return prompt;
}