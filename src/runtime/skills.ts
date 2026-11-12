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

/** Drop a leading UTF-8 BOM so the opening fence is recognised. */
function stripBom(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

/** CRLF/CR (Windows editors) must not hide the "---" fences. */
function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Coerce a YAML scalar to the type callers expect (booleans, numbers, plain text). */
function parseScalar(raw: string): string | number | boolean {
  const value = raw.trim();
  if (value === "" || value === "~" || value === "null") return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d*\.\d+$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parse YAML frontmatter delimited by "---" fences.
 *
 * Mirrors pi-mono's utils/frontmatter.ts semantics (without pulling in a YAML
 * dependency): the closing fence is located with indexOf so it may sit at EOF
 * with no trailing newline, BOM and CRLF/CR are normalised away, and a value can
 * span several indented lines. The previous regex required "\n---\n", so a file
 * saved without a trailing newline, written on Windows, or starting with a BOM
 * lost its whole frontmatter - the skill was then dropped for having no
 * description.
 */
function parseFrontmatter<T>(content: string): { frontmatter: T; body: string } {
  const normalized = normalizeNewlines(stripBom(content));

  if (!normalized.startsWith("---")) {
    return { frontmatter: {} as T, body: normalized };
  }

  const endIndex = normalized.indexOf("\n---", 3);
  if (endIndex === -1) {
    return { frontmatter: {} as T, body: normalized };
  }

  const yamlBlock = normalized.slice(4, endIndex);
  const body = normalized.slice(endIndex + 4).trim();
  const frontmatter: Record<string, string | number | boolean> = {};

  let currentKey: string | null = null;
  for (const line of yamlBlock.split("\n")) {
    if (line.trim() === "") continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    // Continuation of a multi-line scalar (deeper indentation, no new key).
    if (indent > 0 && currentKey !== null && !/^[-\w\"']+:/.test(trimmed)) {
      const previous = String(frontmatter[currentKey] ?? "");
      frontmatter[currentKey] = previous === "" ? trimmed : `${previous}\n${trimmed}`;
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      currentKey = null;
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();
    // Block scalar markers ("|", "|-", ">") introduce indented lines.
    if (rawValue === "|" || rawValue === "|-" || rawValue === ">" || rawValue === ">-") {
      frontmatter[key] = "";
      currentKey = key;
      continue;
    }
    frontmatter[key] = parseScalar(rawValue);
    currentKey = key;
  }

  return { frontmatter: frontmatter as T, body };
}

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