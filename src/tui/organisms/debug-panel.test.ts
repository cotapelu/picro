// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for DebugPanel organism component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DebugPanel, type DebugRoundEvent, type DebugRunEvent } from './debug-panel';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(name: string): KeyEvent {
  return { raw: name, name, modifiers: {} };
}

describe('DebugPanel', () => {
  let panel: DebugPanel;

  describe('constructor', () => {
    it('should create with default options', () => {
      panel = new DebugPanel();
      expect(panel['options'].width).toBe(50);
      expect(panel['options'].height).toBe(15);
      expect(panel['options'].showRounds).toBe(true);
      expect(panel['options'].showRun).toBe(true);
    });

    it('should accept custom options', () => {
      panel = new DebugPanel({ width: 60, height: 10, showRounds: false });
      expect(panel['options'].width).toBe(60);
      expect(panel['options'].height).toBe(10);
      expect(panel['options'].showRounds).toBe(false);
    });

    it('should initialize isFocused false', () => {
      panel = new DebugPanel();
      expect(panel.isFocused).toBe(false);
    });
  });

  describe('onRoundEvent()', () => {
    it('should push round metrics', () => {
      panel = new DebugPanel();
      const event: DebugRoundEvent = {
        round: 1,
        contextBuildingTime: 10,
        memoryRetrievalTime: 5,
        llmRequestTime: 100,
        toolExecutionTime: 50,
        totalRoundTime: 165,
      };
      panel.onRoundEvent(event);
      expect(panel['roundMetrics']).toHaveLength(1);
    });

    it('should keep only last N rounds based on height', () => {
      panel = new DebugPanel({ height: 5 });
      for (let i = 0; i < 20; i++) {
        panel.onRoundEvent({
          round: i,
          contextBuildingTime: 1,
          memoryRetrievalTime: 1,
          llmRequestTime: 1,
          toolExecutionTime: 1,
          totalRoundTime: 4,
        });
      }
      expect(panel['roundMetrics'].length).toBeLessThan(20);
    });
  });

  describe('onRunEvent()', () => {
    it('should store run metric', () => {
      panel = new DebugPanel();
      const event: DebugRunEvent = {
        totalRunTime: 1000,
        totalContextBuildingTime: 100,
        totalMemoryRetrievalTime: 50,
        totalLLMRequestTime: 800,
        totalToolExecutionTime: 50,
      };
      panel.onRunEvent(event);
      expect(panel['runMetric']).toEqual(event);
    });
  });

  describe('clear()', () => {
    it('should clear metrics', () => {
      panel = new DebugPanel();
      panel.onRoundEvent({ round: 1, contextBuildingTime: 0, memoryRetrievalTime: 0, llmRequestTime: 0, toolExecutionTime: 0, totalRoundTime: 0 });
      panel.onRunEvent({ totalRunTime: 0, totalContextBuildingTime: 0, totalMemoryRetrievalTime: 0, totalLLMRequestTime: 0, totalToolExecutionTime: 0 });
      panel.clear();
      expect(panel['roundMetrics']).toHaveLength(0);
      expect(panel['runMetric']).toBeUndefined();
    });
  });

  describe('handleKey()', () => {
    it('should be defined but no-op for Escape', () => {
      panel = new DebugPanel();
      expect(() => panel.handleKey?.(createKeyEvent('001b', 'escape'))).not.toThrow();
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      panel = new DebugPanel({ width: 60, height: 10 });
    });

    it('should render a bordered box', () => {
      const result = panel.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('┘')).toBe(true);
    });

    it('should show title "Debug Metrics"', () => {
      const result = panel.draw(defaultContext);
      expect(result.some(l => l.includes('Debug Metrics'))).toBe(true);
    });

    it('should show run metrics when showRun=true and data present', () => {
      panel.onRunEvent({
        totalRunTime: 1234,
        totalContextBuildingTime: 100,
        totalMemoryRetrievalTime: 200,
        totalLLMRequestTime: 900,
        totalToolExecutionTime: 34,
      });
      const result = panel.draw(defaultContext);
      expect(result.some(l => l.includes('Total:') && l.includes('1.234s'))).toBe(true);
    });

    it('should show round metrics when showRounds=true', () => {
      panel.onRoundEvent({
        round: 5,
        contextBuildingTime: 10,
        memoryRetrievalTime: 20,
        llmRequestTime: 100,
        toolExecutionTime: 30,
        totalRoundTime: 160,
      });
      const result = panel.draw(defaultContext);
      expect(result.some(l => l.includes('Round 5'))).toBe(true);
    });

    it('should respect width', () => {
      const result = panel.draw({ ...defaultContext, width: 20 });
      result.forEach(l => {
        expect(l.length).toBeLessThanOrEqual(20);
      });
    });

    it('should handle empty metrics', () => {
      const result = panel.draw(defaultContext);
      // Should still draw box
      expect(result.length).toBeGreaterThan(2);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      panel = new DebugPanel();
      expect(() => panel.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very small height', () => {
      panel = new DebugPanel({ height: 3 });
      expect(() => panel.draw(defaultContext)).not.toThrow();
    });

    it('should handle zero width context', () => {
      panel = new DebugPanel();
      const result = panel.draw({ ...defaultContext, width: 0 });
      expect(result).toBeDefined();
    });
  });
});