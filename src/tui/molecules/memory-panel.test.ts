// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for MemoryPanel molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryPanel, type MemoryEntry } from './memory-panel';
import type { RenderContext } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('MemoryPanel', () => {
  let memories: MemoryEntry[];
  let panel: MemoryPanel;

  beforeEach(() => {
    memories = [
      { id: '1', content: 'First memory content', score: 0.9, metadata: { source: 'user' } },
      { id: '2', content: 'Second memory content', score: 0.7 },
      { id: '3', content: 'Third memory with longer content that exceeds max display', score: 0.5 },
    ];
  });

  describe('constructor', () => {
    it('should create with memories and default maxDisplay=10', () => {
      panel = new MemoryPanel({ memories });
      expect(panel).toBeDefined();
      expect(panel['maxDisplay']).toBe(10);
    });

    it('should accept custom maxDisplay', () => {
      panel = new MemoryPanel({ memories, maxDisplay: 2 });
      expect(panel['maxDisplay']).toBe(2);
    });

    it('should accept onSelect and onDelete callbacks', () => {
      const onSelect = vi.fn();
      const onDelete = vi.fn();
      panel = new MemoryPanel({ memories, onSelect, onDelete });
      expect(panel['onSelect']).toBe(onSelect);
      expect(panel['onDelete']).toBe(onDelete);
    });

    it('should build SelectList items from memories', () => {
      panel = new MemoryPanel({ memories, maxDisplay: 5 });
      const items = panel['items'];
      expect(items).toHaveLength(3); // all memories included
      expect(items[0].value).toBe('1');
      expect(items[0].label).toContain('90%'); // score * 100
      expect(items[0].label).toContain('[user]');
    });

    it('should truncate long content', () => {
      panel = new MemoryPanel({ memories, maxDisplay: 3 });
      const label = panel['items'][2].label; // third memory
      expect(label).toContain('...');
    });
  });

  describe('setMemories()', () => {
    it('should update memories and rebuild items', () => {
      panel = new MemoryPanel({ memories });
      const newMemories: MemoryEntry[] = [{ id: '4', content: 'New memory' }];
      panel.setMemories(newMemories);
      expect(panel['memories']).toHaveLength(1);
      expect(panel['items']).toHaveLength(1);
    });

    it('should respect maxDisplay when rebuilding', () => {
      panel = new MemoryPanel({ memories, maxDisplay: 2 });
      panel.setMemories(memories); // all 3
      expect(panel['items']).toHaveLength(2); // only first 2
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      panel = new MemoryPanel({ memories, maxDisplay: 5 });
    });

    it('should delegate to SelectList.draw()', () => {
      const result = panel.draw(defaultContext);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should display memory items with score and source', () => {
      const result = panel.draw(defaultContext);
      expect(result.some(line => line.includes('90%') && line.includes('[user]'))).toBe(true);
    });

    it('should handle empty memories', () => {
      panel.setMemories([]);
      const result = panel.draw(defaultContext);
      // SelectList with empty items returns empty array
      expect(result).toHaveLength(0);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      panel = new MemoryPanel({ memories });
      expect(() => panel.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle memory with missing score', () => {
      const memWithoutScore: MemoryEntry[] = [{ id: 'x', content: 'No score' }];
      panel = new MemoryPanel({ memories: memWithoutScore });
      const label = panel['items'][0].label;
      expect(label).not.toContain('%');
    });

    it('should handle memory with missing metadata', () => {
      const memWithoutMeta: MemoryEntry[] = [{ id: 'x', content: 'No meta', score: 0.5 }];
      panel = new MemoryPanel({ memories: memWithoutMeta });
      const label = panel['items'][0].label;
      expect(label).not.toContain('[');
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(1000);
      const mem: MemoryEntry[] = [{ id: 'x', content: longContent }];
      panel = new MemoryPanel({ memories: mem, maxDisplay: 1 });
      expect(panel['items'][0].label.length).toBeLessThan(100); // truncated
    });

    it('should handle unicode content', () => {
      const unicodeMem: MemoryEntry[] = [{ id: 'x', content: '😀😁😂' }];
      panel = new MemoryPanel({ memories: unicodeMem });
      expect(panel['items'][0].label).toContain('😀');
    });

    it('should handle maxDisplay larger than memories', () => {
      panel = new MemoryPanel({ memories, maxDisplay: 100 });
      expect(panel['items']).toHaveLength(memories.length);
    });
  });
});