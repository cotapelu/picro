// SPDX-License-Identifier: Apache-2.0
/**
 * System prompt construction for AgentSession.
 * Reimplemented from reference logic without copying.
 */

export interface BuildSystemPromptOptions {
  customPrompt?: string;
  selectedTools?: string[];
  toolSnippets?: Record<string, string>;
  promptGuidelines?: string[];
  appendSystemPrompt?: string;
  cwd: string;
  contextFiles?: Array<{ path: string; content: string }>;
  skills?: Array<{ name: string; description: string; filePath: string }>;
}

/** Format skills for prompt inclusion */
export function formatSkillsForPrompt(skills: Array<{ name: string; description: string; filePath: string }>): string {
  let text = "\n# Available Skills\n\n";
  text += "Use /skill:<name> args to invoke a skill. Skills are reusable templates for common tasks.\n\n";
  for (const skill of skills) {
    text += `## ${skill.name}\n${skill.description}\n\n`;
  }
  return text;
}

/** Build the system prompt */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
  const {
    customPrompt,
    selectedTools,
    toolSnippets,
    promptGuidelines,
    appendSystemPrompt,
    cwd,
    contextFiles,
    skills,
  } = options;

  const promptCwd = cwd.replace(/\\/g, "/");

  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const appendSection = appendSystemPrompt ? `\n\n${appendSystemPrompt}` : "";

  // Custom prompt branch
  if (customPrompt) {
    let prompt = customPrompt;

    if (appendSection) {
      prompt += appendSection;
    }

    // Append project context files
    if (contextFiles && contextFiles.length > 0) {
      prompt += "\n\n<project_context>\n\n";
      prompt += "Project-specific instructions and guidelines:\n\n";
      for (const { path: filePath, content } of contextFiles) {
        prompt += `<project_instructions path="${filePath}">\n${content}\n</project_instructions>\n\n`;
      }
      prompt += "</project_context>\n";
    }

    // Append skills section (always if available)
    if (skills && skills.length > 0) {
      prompt += formatSkillsForPrompt(skills);
    }

    // Always enforce action protocol even with custom prompts
    prompt += "\n\nACTION PROTOCOL (MANDATORY):\n";
    prompt += "- IMMEDIATELY call tools when you need to perform actions. Do NOT describe actions in natural language first.\n";
    prompt += "- DO NOT output: \"I will use X tool\" or \"Let me scan\". Instead, directly call the tool.\n";
    prompt += "- Only provide explanations after tool execution if the user asks for reasoning.\n";
    prompt += "- Keep responses concise; avoid any commentary when action is required.\n";

    // Add date and working directory last
    prompt += `\nCurrent date: ${date}`;
    prompt += `\nCurrent working directory: ${promptCwd}`;

    return prompt;
  }

  // Build default prompt from scratch
  const tools = selectedTools || ["read", "bash", "edit", "write"];
  const visibleTools = toolSnippets ? tools.filter((name) => !!toolSnippets[name]) : tools;
  const toolsList = visibleTools.length > 0
    ? visibleTools.map((name) => `- ${name}: ${toolSnippets![name]}`).join("\n")
    : "(none)";

  // Build guidelines
  const guidelinesSet = new Set<string>();
  const addGuideline = (guideline: string) => {
    if (guideline && !guidelinesSet.has(guideline)) {
      guidelinesSet.add(guideline);
    }
  };

  const hasBash = tools.includes("bash");
  const hasGrep = tools.includes("grep");
  const hasFind = tools.includes("find");
  const hasLs = tools.includes("ls");

  // Tool-specific file exploration guidelines
  if (hasBash && !hasGrep && !hasFind && !hasLs) {
    addGuideline("Use bash for file operations like ls, rg, find");
  } else if (hasBash && (hasGrep || hasFind || hasLs)) {
    addGuideline("Prefer grep/find/ls tools over bash for file exploration (faster, respects .gitignore)");
  }

  // Custom guidelines from options
  for (const guideline of promptGuidelines ?? []) {
    const normalized = guideline.trim();
    if (normalized) addGuideline(normalized);
  }

  // Always include these default guidelines
  addGuideline("Be concise in your responses");
  addGuideline("Show file paths clearly when working with files");

  const guidelines = Array.from(guidelinesSet).map((g) => `- ${g}`).join("\n");

  // Pi documentation paths (using reference paths)
  const readmePath = "README.md";
  const docsPath = "docs/";
  const examplesPath = "examples/";

  let prompt = `You are an expert coding assistant operating inside pi, a coding agent harness. You help users by reading files, executing commands, editing code, and writing new files.

Available tools:
${toolsList}

In addition to the tools above, you may have access to other custom tools depending on the project.

Guidelines:
${guidelines}

Action Protocol:
- IMMEDIATELY call tools when you need to perform actions. Do NOT describe actions in natural language first.
- DO NOT output: "I will use X tool" or "Let me scan". Instead, directly call the tool.
- Only provide explanations after tool execution if the user asks for reasoning.
- Be extremely concise: one-sentence answers, direct tool calls, no fluff.
- For reasoning tasks, keep thinking internal; do not narrate your thought process.

Pi documentation (read only when the user asks about pi itself, its SDK, extensions, themes, skills, or TUI):
- Main documentation: ${readmePath}
- Additional docs: ${docsPath}
- Examples: ${examplesPath}
- When asked about: extensions, themes, skills, prompt templates, TUI components, keybindings, SDK integrations, custom providers, adding models, pi packages
- When working on pi topics, read the docs and examples, and follow .md cross-references before implementing
- Always read pi .md files completely and follow links to related docs (e.g., tui.md for TUI API details)`;

  if (appendSection) {
    prompt += appendSection;
  }

  // Append project context files
  if (contextFiles && contextFiles.length > 0) {
    prompt += "\n\n<project_context>\n\n";
    prompt += "Project-specific instructions and guidelines:\n\n";
    for (const { path: filePath, content } of contextFiles) {
      prompt += `<project_instructions path="${filePath}">\n${content}\n</project_instructions>\n\n`;
    }
    prompt += "</project_context>\n";
  }

  // Append skills section (always if available)
  if (skills && skills.length > 0) {
    prompt += formatSkillsForPrompt(skills);
  }

  // Add date and working directory last
  prompt += `\nCurrent date: ${date}`;
  prompt += `\nCurrent working directory: ${promptCwd}`;

  return prompt;
}
