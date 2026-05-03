import { describe, it, expect } from 'vitest';
import { SkillInvocationMessage } from '../skill-invocation-message.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('SkillInvocationMessage', () => {
  it('should render invoking status', () => {
    const msg = new SkillInvocationMessage({ name: 'search', status: 'invoking' });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.some(l => l.includes('Skill Invoked'))).toBe(true);
    expect(result.some(l => l.includes('search'))).toBe(true);
    expect(result.some(l => l.includes('⏳'))).toBe(true);
  });

  it('should render running status', () => {
    const msg = new SkillInvocationMessage({ name: 'calc', status: 'running' });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.some(l => l.includes('⚙'))).toBe(true);
  });

  it('should render complete status', () => {
    const msg = new SkillInvocationMessage({ name: 'done', status: 'complete' });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.some(l => l.includes('✓'))).toBe(true);
  });
});
