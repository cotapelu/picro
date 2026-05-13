// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for SkillInvocationMessage atom
 */

import { describe, it, expect } from 'vitest';
import { SkillInvocationMessage, type SkillInfo } from './skill-invocation-message';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('SkillInvocationMessage', () => {
  describe('constructor', () => {
    it('should create with skill info', () => {
      const skill: SkillInfo = { name: 'Search', status: 'invoking' };
      const msg = new SkillInvocationMessage(skill);
      expect(msg['skill']).toEqual(skill);
    });
  });

  describe('draw()', () => {
    it('should render bordered box', () => {
      const msg = new SkillInvocationMessage({ name: 'Test', status: 'invoking' });
      const result = msg.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('└')).toBe(true);
    });

    it('should show skill name and appropriate icon per status', () => {
      const msg = new SkillInvocationMessage({ name: 'Search', status: 'running' });
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('Search'))).toBe(true);
      expect(result.some(l => l.includes('⚙'))).toBe(true);
    });

    it('should show checkmark for complete', () => {
      const msg = new SkillInvocationMessage({ name: 'Skill', status: 'complete' });
      const result = msg.draw(defaultContext);
      expect(result.some(l => l.includes('✓'))).toBe(true);
    });

    it('should fill height with empty lines', () => {
      const msg = new SkillInvocationMessage({ name: 'S', status: 'invoking' });
      const result = msg.draw({ ...defaultContext, height: 10 });
      expect(result.length).toBe(10);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const msg = new SkillInvocationMessage({ name: 'S', status: 'complete' });
      expect(() => msg.clearCache()).not.toThrow();
    });
  });
});