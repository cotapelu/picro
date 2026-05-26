"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Skills - Skill loading and discovery
 *
 * Học từ legacy mà KHÔNG copy code:
 * - SKILL.md discovery
 * - Frontmatter parsing
 * - Validation
 * - Format for prompt
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSkillsFromDir = loadSkillsFromDir;
exports.formatSkillsForPrompt = formatSkillsForPrompt;
exports.loadSkills = loadSkills;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
        return { frontmatter: {}, content };
    }
    const frontmatterBlock = match[1];
    const body = match[2];
    const frontmatter = {};
    for (const line of frontmatterBlock.split("\n")) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1)
            continue;
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value;
    }
    return { frontmatter: frontmatter, content: body };
}
function loadSkillFromFile(filePath) {
    try {
        const rawContent = (0, node_fs_1.readFileSync)(filePath, "utf-8");
        const { frontmatter } = parseFrontmatter(rawContent);
        const skillDir = (0, node_path_1.dirname)(filePath);
        const parentDirName = (0, node_path_1.basename)(skillDir);
        const name = frontmatter.name || parentDirName;
        const description = frontmatter.description || "";
        const disableModelInvocation = frontmatter["disable-model-invocation"] === true;
        // Validate name
        if (!/^[a-z0-9-]+$/.test(name) || name.length > MAX_NAME_LENGTH) {
            console.warn(`Invalid skill name: ${name}`);
            return null;
        }
        // Require description
        if (!description || description.trim() === "") {
            console.warn(`Skill missing description: ${filePath}`);
            return null;
        }
        return {
            name,
            description,
            filePath,
            disableModelInvocation,
        };
    }
    catch (error) {
        console.warn(`Failed to load skill from ${filePath}:`, error);
        return null;
    }
}
function loadSkillsFromDir(dir) {
    const skills = [];
    if (!(0, node_fs_1.existsSync)(dir)) {
        return skills;
    }
    try {
        const entries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const skillPath = (0, node_path_1.join)(dir, entry.name, "SKILL.md");
            if ((0, node_fs_1.existsSync)(skillPath)) {
                const skill = loadSkillFromFile(skillPath);
                if (skill) {
                    skills.push(skill);
                }
            }
        }
    }
    catch {
        // Ignore errors
    }
    return skills;
}
function formatSkillsForPrompt(skills) {
    const visibleSkills = skills.filter(s => !s.disableModelInvocation);
    if (visibleSkills.length === 0) {
        return "";
    }
    const lines = [
        "\n\nThe following skills provide specialized instructions for specific tasks.",
        "",
        "<available_skills>",
    ];
    for (const skill of visibleSkills) {
        lines.push("  <skill>");
        lines.push(`    <name>${skill.name}</name>`);
        lines.push(`    <description>${skill.description}</description>`);
        lines.push(`    <location>${skill.filePath}</location>`);
        lines.push("  </skill>");
    }
    lines.push("</available_skills>");
    return lines.join("\n");
}
function loadSkills(options) {
    const { cwd, agentDir = (0, node_path_1.join)((0, node_os_1.homedir)(), ".pi", "agent"), skillPaths = [], includeDefaults = true } = options;
    const allSkills = [];
    const seen = new Set();
    // Load from default directories
    if (includeDefaults) {
        const userSkills = loadSkillsFromDir((0, node_path_1.join)(agentDir, "skills"));
        const projectSkills = loadSkillsFromDir((0, node_path_1.join)(cwd, ".pi", "skills"));
        for (const skill of [...userSkills, ...projectSkills]) {
            if (!seen.has(skill.name)) {
                seen.add(skill.name);
                allSkills.push(skill);
            }
        }
    }
    // Load from explicit paths
    for (const path of skillPaths) {
        const skills = loadSkillsFromDir(path);
        for (const skill of skills) {
            if (!seen.has(skill.name)) {
                seen.add(skill.name);
                allSkills.push(skill);
            }
        }
    }
    return allSkills;
}
//# sourceMappingURL=skills.js.map