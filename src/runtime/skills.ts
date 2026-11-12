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
import { parseFrontmatter } from "./frontmatter.js";

export interface Skill {
  name: string;
  description: string;
  filePath: string;
  disableModelInvocation: boolean;
}

const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

export function loadSkillFromFile(filePath: string): Skill | null {
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
    const rawFlag = frontmatter["disable-model-invocation"];
    const disableModelInvocation = rawFlag === true || String(rawFlag).toLowerCase() === 'true';

    // Validate name (Agent Skills spec: lowercase a-z, 0-9, hyphens; no
    // leading/trailing hyphen and no consecutive hyphens).
    if (
      !/^[a-z0-9-]+$/.test(name) ||
      name.length > MAX_NAME_LENGTH ||
      name.startsWith("-") ||
      name.endsWith("-") ||
      name.includes("--")
    ) {
      console.warn(`Invalid skill name: ${name}`);
      return null;
    }

    // Require description (and honour the documented length limit, which was
    // declared but never enforced).
    if (!description || description.trim() === "") {
      console.warn(`Skill missing description: ${filePath}`);
      return null;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      console.warn(
        `Skill description exceeds ${MAX_DESCRIPTION_LENGTH} characters (${description.length}): ${filePath}`
      );
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