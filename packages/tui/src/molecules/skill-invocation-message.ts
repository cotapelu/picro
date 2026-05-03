/**
 * Skill Invocation Message Component
 * Displays skill being invoked
 */

import type { UIElement, RenderContext } from '../atoms/base.js';

export interface SkillInfo {
  name: string;
  status: 'invoking' | 'running' | 'complete';
}

export class SkillInvocationMessage implements UIElement {
  private skill: SkillInfo;

  constructor(skill: SkillInfo) {
    this.skill = skill;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' 🎯 Skill Invoked ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    const icon = this.skill.status === 'invoking' ? '⏳' : this.skill.status === 'running' ? '⚙' : '✓';
    const statusLine = ' Skill: ' + this.skill.name + ' ' + icon;
    lines.push('│' + statusLine + ' '.repeat(borderWidth - statusLine.length) + '│');

    while (lines.length < context.height - 1) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    return lines;
  }

  clearCache(): void {
    // No cache
  }
}
