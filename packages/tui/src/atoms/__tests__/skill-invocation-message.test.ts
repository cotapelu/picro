import { describe, it, expect } from 'vitest';
import { SkillInvocationMessage } from '../skill-invocation-message.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('SkillInvocationMessage', () => {
  it('should render skill invocation', () => {
    const msg = new SkillInvocationMessage({
      skillName: 'web-search',
      input: 'query=hello',
    });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('web-search');
    expect(result.join('\n')).toContain('query=hello');
  });

  it('should handle no input', () => {
    const msg = new SkillInvocationMessage({ skillName: 'test' });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('test');
  });
});
