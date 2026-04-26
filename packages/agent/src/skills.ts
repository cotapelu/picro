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

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";

export interface Skill {
  name: string;
  description: string;
  filePath: string;
  disableModelInvocation: boolean;
}

const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

function parseFrontmatter<T>(content: string): { frontmatter: T; content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {} as T, content };
  }

  const frontmatterBlock = match[1];
  const body = match[2];
  const frontmatter: Record<string, any> = {};

  for (const line of frontmatterBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    frontmatter[key] = value;
  }

  return { frontmatter: frontmatter as T, content: body };
}

function loadSkillFromFile(filePath: string): Skill | null {
  try {
    const rawContent = readFileSync(filePath, "utf-8");
    const { frontmatter } = parseFrontmatter<{
      name?: string;
      description?: string;
      "disable-model-invocation"?: boolean;
    }>(rawContent);

    const skillDir = dirname(filePath);
    const parentDirName = basename(skillDir);

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
  } catch (error) {
    console.warn(`Failed to load skill from ${filePath}:`, error);
    return null;
  }
}

export function loadSkillsFromDir(dir: string): Skill[] {
  const skills: Skill[] = [];
  
  if (!existsSync(dir)) {
    return skills;
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const skillPath = join(dir, entry.name, "SKILL.md");
      if (existsSync(skillPath)) {
        const skill = loadSkillFromFile(skillPath);
        if (skill) {
          skills.push(skill);
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return skills;
}

export function formatSkillsForPrompt(skills: Skill[]): string {
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

export interface LoadSkillsOptions {
  cwd: string;
  agentDir?: string;
  skillPaths?: string[];
  includeDefaults?: boolean;
}

export function loadSkills(options: LoadSkillsOptions): Skill[] {
  const { cwd, agentDir = join(homedir(), ".pi", "agent"), skillPaths = [], includeDefaults = true } = options;
  const allSkills: Skill[] = [];
  const seen = new Set<string>();

  // Load from default directories
  if (includeDefaults) {
    const userSkills = loadSkillsFromDir(join(agentDir, "skills"));
    const projectSkills = loadSkillsFromDir(join(cwd, ".pi", "skills"));
    
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