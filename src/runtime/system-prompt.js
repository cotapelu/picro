// SPDX-License-Identifier: Apache-2.0
/**
 * System prompt construction for AgentSession.
 * Moved from agent/ to runtime/ because it's UI/runtime specific.
 *
 * Builds the system prompt with:
 * - Tool snippets and guidelines
 * - Project context files
 * - Skills
 * - Date and working directory
 */
/** Build the system prompt */
export function buildSystemPrompt(options) {
    const { customPrompt, selectedTools, toolSnippets, promptGuidelines, appendSystemPrompt, cwd, contextFiles, skills, } = options;
    const promptCwd = cwd.replace(/\\/g, "/");
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const appendSection = appendSystemPrompt ? `\n\n${appendSystemPrompt}` : "";
    if (customPrompt) {
        let prompt = customPrompt;
        if (appendSection)
            prompt += appendSection;
        if (contextFiles && contextFiles.length > 0) {
            prompt += "\n\n# Project Context\n\n";
            for (const { path: filePath, content } of contextFiles) {
                prompt += `## ${filePath}\n\n${content}\n\n`;
            }
        }
        if (skills && skills.length > 0) {
            prompt += formatSkillsForPrompt(skills);
        }
        prompt += `\nCurrent date: ${date}`;
        prompt += `\nCurrent working directory: ${promptCwd}`;
        return prompt;
    }
    // Build tools list (only show tools that have snippets)
    const tools = selectedTools || ["read", "bash", "edit", "write"];
    const visibleTools = tools.filter((name) => toolSnippets?.[name]);
    const toolsList = visibleTools.length > 0
        ? visibleTools.map((name) => `- ${name}: ${toolSnippets[name]}`).join("\n")
        : "(none)";
    // Build guidelines
    const guidelinesList = [];
    const guidelinesSet = new Set();
    const addGuideline = (g) => {
        if (guidelinesSet.has(g))
            return;
        guidelinesSet.add(g);
        guidelinesList.push(g);
    };
    // Tool-specific guidelines
    const hasBash = tools.includes("bash");
    const hasGrep = tools.includes("grep");
    const hasFind = tools.includes("find");
    const hasLs = tools.includes("ls");
    if (hasBash && !hasGrep && !hasFind && !hasLs) {
        addGuideline("Use bash for file operations like ls, rg, find");
    }
    else if (hasBash && (hasGrep || hasFind || hasLs)) {
        addGuideline("Prefer grep/find/ls tools over bash for file exploration (faster, respects .gitignore)");
    }
    // Custom guidelines
    for (const guideline of promptGuidelines || []) {
        const normalized = guideline.trim();
        if (normalized)
            addGuideline(normalized);
    }
    // Always include
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
- Main documentation: README.md
- Additional docs: docs/
- Examples: examples/
- When asked about: extensions, themes, skills, prompt templates, TUI components, keybindings, SDK integrations, custom providers, adding models, pi packages
- When working on pi topics, read the docs and examples, and follow .md cross-references before implementing
- Always read pi .md files completely and follow links to related docs (e.g., tui.md for TUI API details)`;
    if (appendSection)
        prompt += appendSection;
    if (contextFiles && contextFiles.length > 0) {
        prompt += "\n\n# Project Context\n\n";
        for (const { path: filePath, content } of contextFiles) {
            prompt += `## ${filePath}\n\n${content}\n\n`;
        }
    }
    if (skills && skills.length > 0) {
        prompt += formatSkillsForPrompt(skills);
    }
    prompt += `\nCurrent date: ${date}`;
    prompt += `\nCurrent working directory: ${promptCwd}`;
    return prompt;
}
/** Format skills for prompt inclusion */
function formatSkillsForPrompt(skills) {
    let text = "\n# Available Skills\n\n";
    text += "Use /skill:<name> args to invoke a skill. Skills are reusable templates for common tasks.\n\n";
    for (const skill of skills) {
        text += `## ${skill.name}\n${skill.description}\n\n`;
    }
    return text;
}
