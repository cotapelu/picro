import { describe, it, expect } from 'vitest';
import { CustomMessage } from '../custom-message';
import type { RenderContext } from '../base';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('CustomMessage', () => {
  describe('Initialization', () => {
    it('should require customType and content', () => {
      const msg = new CustomMessage({
        customType: 'notice',
        content: 'Hello',
      });
      expect(msg).toBeInstanceOf(CustomMessage);
    });

    it('should accept all options', () => {
      const msg = new CustomMessage({
        customType: 'alert',
        content: 'Message body',
        label: 'Custom Label',
        color: 'yellow',
        padding: 3,
      });
      expect(msg).toBeInstanceOf(CustomMessage);
    });
  });

  describe('Content Rendering', () => {
    it('should render string content', () => {
      const msg = new CustomMessage({
        customType: 'info',
        content: 'Simple string content',
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('Simple string content');
    });

    it('should render structured content (text parts only)', () => {
      const msg = new CustomMessage({
        customType: 'rich',
        content: [
          { type: 'text', text: 'First part' },
          { type: 'text', text: 'Second part' },
          { type: 'other', text: 'Ignored' },
        ],
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('First part');
      expect(result.join('\n')).toContain('Second part');
    });

    it('should handle empty structured content', () => {
      const msg = new CustomMessage({
        customType: 'empty',
        content: [
          { type: 'other', text: 'Not text' },
        ],
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.some(l => l.includes('(empty)'))).toBe(true);
    });
  });

  describe('Label and Header', () => {
    it('should use default label from customType', () => {
      const msg = new CustomMessage({
        customType: 'warning',
        content: 'Alert!',
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result[0]).toContain('[warning]');
    });

    it('should use custom label if provided', () => {
      const msg = new CustomMessage({
        customType: 'info',
        label: 'IMPORTANT',
        content: 'Content',
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result[0]).toContain('IMPORTANT');
    });
  });

  describe('Color Styling', () => {
    it('should apply foreground color to content', () => {
      const msg = new CustomMessage({
        customType: 'colored',
        content: 'Colored text',
        color: 'green',
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('\x1b[32m');
    });
  });

  describe('Divider', () => {
    it('should include divider line after header', () => {
      const msg = new CustomMessage({
        customType: 'test',
        content: 'Body',
      });
      const ctx = createContext(80, 24);
      const result = msg.draw(ctx);

      expect(result.some(l => l.includes('─'))).toBe(true);
    });
  });

  describe('setContent()', () => {
    it('should update string content', () => {
      const msg = new CustomMessage({
        customType: 'test',
        content: 'Initial',
      });
      const ctx = createContext(80, 24);

      msg.setContent('Updated');
      const result = msg.draw(ctx);

      expect(result.join('\n')).toContain('Updated');
    });
  });

  describe('setExpanded()', () => {
    it('should toggle expanded state', () => {
      const msg = new CustomMessage({
        customType: 'test',
        content: 'Content',
      });

      msg.setExpanded(true);
      expect(msg.opts.expanded).toBe(true);

      msg.setExpanded(false);
      expect(msg.opts.expanded).toBe(false);
    });
  });
});
