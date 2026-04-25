/**
 * Template Manager
 * Save and load conversation templates/snippets
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, basename, extname } from 'path';

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
  variables: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isBuiltin: boolean;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
}

/**
 * Built-in templates
 */
const builtinTemplates: Template[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    category: 'code',
    description: 'Review code for best practices and bugs',
    content: `Please review this code for:
1. Bugs or logical errors
2. Best practices adherence  
3. Performance optimizations
4. Security vulnerabilities
5. Code style consistency

\`\`\`
{{code}}
\`\`\``,
    variables: ['code'],
    tags: ['review', 'code', 'quality'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltin: true,
  },
  {
    id: 'explain-code',
    name: 'Explain Code',
    category: 'code',
    description: 'Explain what code does in detail',
    content: `Please explain this code in detail:
1. What does it do overall?
2. What do each major section accomplish?
3. What are the key algorithms or patterns used?
4. Any potential issues or improvements?

\`\`\`
{{code}}
\`\`\``,
    variables: ['code'],
    tags: ['explain', 'understand', 'comments'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltin: true,
  },
  {
    id: 'refactor',
    name: 'Refactor Code',
    category: 'code',
    description: 'Refactor code for better structure',
    content: `Please refactor this code to improve:
1. Readability and maintainability
2. Reduce complexity where possible
3. Better error handling
4. Follow best practices

Original:
\`\`\`
{{code}}
\`\`\`

Provide the refactored version with explanation of changes.`,
    variables: ['code'],
    tags: ['refactor', 'improve', 'clean'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltin: true,
  },
  {
    id: 'write-tests',
    name: 'Write Tests',
    category: 'testing',
    description: 'Generate unit tests for code',
    content: `Please write comprehensive unit tests for this code:
1. Happy path scenarios
2. Edge cases and boundary conditions
3. Error handling cases
4. Mock external dependencies as needed

Code to test:
\`\`\`
{{code}}
\`\`\`

Include setup, teardown, and test assertions.`,
    variables: ['code'],
    tags: ['test', 'unit', 'coverage'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltin: true,
  },
  {
    id: 'bug-fix',
    name: 'Debug & Fix',
    category: 'debugging',
    description: 'Debug and fix reported issues',
    content: `There's a bug in this code. Please:
1. Identify the root cause
2. Explain why it's happening
3. Provide a fix
4. Suggest prevention strategies

Problem description: {{description}}

\`\`\`
{{code}}
\`\`\``,
    variables: ['description', 'code'],
    tags: ['debug', 'fix', 'bug'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltin: true,
  },
  {
    id: 'document',
    name: 'Add Documentation',
    category: 'docs',
    description: 'Generate documentation for code',
    content: `Please add comprehensive documentation:
1. JSDoc/TSDoc comments for functions
2. Inline comments for complex logic
3. README-style overview
4. Usage examples

\`\`\`
{{code}}
\`\`\``,
    variables: ['code'],
    tags: ['docs', 'documentation', 'comments'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltin: true,
  },
  {
    id: 'optimize',
    name: 'Optimize Performance',
    category: 'performance',
    description: 'Optimize code for better performance',
    content: `Please optimize this code for performance:
1. Identify bottlenecks
2. Suggest algorithm improvements
3. Memory usage optimizations
4. Benchmark considerations

\`\`\`
{{code}}
\`\`\``,
    variables: ['code'],
    tags: ['perf', 'optimize', 'speed'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltin: true,
  },
  {
    id: 'security-review',
    name: 'Security Review',
    category: 'security',
    description: 'Review code for security issues',
    content: `Please perform a security review:
1. Input validation issues
2. Injection vulnerabilities
3. Authentication/authorization flaws
4. Data exposure risks
5. Dependency vulnerabilities

\`\`\`
{{code}}
\`\`\``,
    variables: ['code'],
    tags: ['security', 'audit', 'safe'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltin: true,
  },
];

/**
 * Template categories
 */
const categories: TemplateCategory[] = [
  { id: 'code', name: 'Code', description: 'General code operations' },
  { id: 'testing', name: 'Testing', description: 'Test-related templates' },
  { id: 'debugging', name: 'Debugging', description: 'Debug and fix issues' },
  { id: 'docs', name: 'Documentation', description: 'Documentation tasks' },
  { id: 'performance', name: 'Performance', description: 'Performance optimization' },
  { id: 'security', name: 'Security', description: 'Security reviews' },
  { id: 'custom', name: 'Custom', description: 'User-defined templates' },
];

/**
 * Template Manager
 */
export class TemplateManager {
  private templates: Map<string, Template> = new Map();
  private savePath: string;

  constructor(savePath: string = './.coding-agent/templates.json') {
    this.savePath = savePath;
    this.loadBuiltin();
    this.load();
  }

  /**
   * Load built-in templates
   */
  private loadBuiltin(): void {
    for (const template of builtinTemplates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Get all templates
   */
  getAll(): Template[] {
    return Array.from(this.templates.values())
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  /**
   * Get templates by category
   */
  getByCategory(category: string): Template[] {
    return this.getAll().filter(t => t.category === category);
  }

  /**
   * Get template by ID
   */
  getById(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * Search templates
   */
  search(query: string): Template[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.tags.some(tag => tag.toLowerCase().includes(lower))
    );
  }

  /**
   * Render template with variables
   */
  render(templateId: string, variables: Record<string, string>): string {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);

    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return content;
  }

  /**
   * Create custom template
   */
  create(name: string, category: string, description: string, content: string): Template {
    const id = `custom-${Date.now()}`;
    const template: Template = {
      id,
      name,
      category: category || 'custom',
      description,
      content,
      variables: this.extractVariables(content),
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBuiltin: false,
    };

    this.templates.set(id, template);
    this.save();
    return template;
  }

  /**
   * Update custom template
   */
  update(id: string, updates: Partial<Omit<Template, 'id' | 'isBuiltin'>>): Template | null {
    const template = this.templates.get(id);
    if (!template || template.isBuiltin) return null;

    const updated = {
      ...template,
      ...updates,
      updatedAt: Date.now(),
    };
    
    this.templates.set(id, updated);
    this.save();
    return updated;
  }

  /**
   * Delete custom template
   */
  delete(id: string): boolean {
    const template = this.templates.get(id);
    if (!template || template.isBuiltin) return false;
    this.templates.delete(id);
    this.save();
    return true;
  }

  /**
   * Get categories
   */
  getCategories(): TemplateCategory[] {
    return [...categories];
  }

  /**
   * Extract variables from template content
   */
  private extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.slice(2, -2)))];
  }

  /**
   * Load from disk
   */
  private load(): void {
    try {
      if (!existsSync(this.savePath)) return;
      const data = JSON.parse(readFileSync(this.savePath, 'utf-8'));
      if (data.templates) {
        for (const template of data.templates) {
          if (!template.isBuiltin) {
            this.templates.set(template.id, template);
          }
        }
      }
    } catch {}
  }

  /**
   * Save to disk
   */
  private save(): void {
    try {
      const custom = this.getAll().filter(t => !t.isBuiltin);
      const dir = dirname(this.savePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(this.savePath, JSON.stringify({ templates: custom }, null, 2));
    } catch {}
  }
}

/**
 * Global template manager
 */
export const templateManager = new TemplateManager();
