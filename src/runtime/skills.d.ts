/**
 * Skills - Skill loading and discovery
 *
 * Học từ legacy mà KHÔNG copy code:
 * - SKILL.md discovery
 * - Frontmatter parsing
 * - Validation
 * - Format for prompt
 */
export interface Skill {
    name: string;
    description: string;
    filePath: string;
    disableModelInvocation: boolean;
}
export declare function loadSkillsFromDir(dir: string): Skill[];
export declare function formatSkillsForPrompt(skills: Skill[]): string;
export interface LoadSkillsOptions {
    cwd: string;
    agentDir?: string;
    skillPaths?: string[];
    includeDefaults?: boolean;
}
export declare function loadSkills(options: LoadSkillsOptions): Skill[];
//# sourceMappingURL=skills.d.ts.map