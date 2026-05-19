// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Stepper atom
 */

import { describe, it, expect } from 'vitest';
import { Stepper, type Step, stepperDefaultTheme } from './stepper';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Stepper', () => {
  const steps: Step[] = [
    { id: '1', label: 'First' },
    { id: '2', label: 'Second' },
    { id: '3', label: 'Third' },
  ];

  describe('constructor', () => {
    it('should create with steps and currentStep clamped', () => {
      const stepper = new Stepper({ steps, currentStep: 5 });
      expect(stepper['currentStep']).toBe(2); // clamped to last
    });

    it('should accept custom theme', () => {
      const stepper = new Stepper({ steps, currentStep: 0, theme: { completedColor: (s) => `\x1b[31m${s}\x1b[0m` } });
      expect(stepper['theme'].completedColor).not.toBe(stepperDefaultTheme.completedColor);
    });

    it('should default showDescription true', () => {
      const stepper = new Stepper({ steps, currentStep: 0 });
      expect(stepper['showDescription']).toBe(true);
    });

    it('should default vertical false', () => {
      const stepper = new Stepper({ steps, currentStep: 0 });
      expect(stepper['vertical']).toBe(false);
    });
  });

  describe('setCurrentStep()', () => {
    it('should update currentStep within bounds', () => {
      const stepper = new Stepper({ steps, currentStep: 0 });
      stepper.setCurrentStep(2);
      expect(stepper['currentStep']).toBe(2);
    });

    it('should clamp to 0', () => {
      const stepper = new Stepper({ steps, currentStep: 1 });
      stepper.setCurrentStep(-5);
      expect(stepper['currentStep']).toBe(0);
    });

    it('should clamp to max', () => {
      const stepper = new Stepper({ steps, currentStep: 1 });
      stepper.setCurrentStep(10);
      expect(stepper['currentStep']).toBe(2);
    });
  });

  describe('nextStep()', () => {
    it('should increment currentStep if not last', () => {
      const stepper = new Stepper({ steps, currentStep: 0 });
      stepper.nextStep();
      expect(stepper['currentStep']).toBe(1);
    });

    it('should not increment past last', () => {
      const stepper = new Stepper({ steps, currentStep: 2 });
      stepper.nextStep();
      expect(stepper['currentStep']).toBe(2);
    });
  });

  describe('previousStep()', () => {
    it('should decrement currentStep if greater than 0', () => {
      const stepper = new Stepper({ steps, currentStep: 2 });
      stepper.previousStep();
      expect(stepper['currentStep']).toBe(1);
    });

    it('should not decrement below 0', () => {
      const stepper = new Stepper({ steps, currentStep: 0 });
      stepper.previousStep();
      expect(stepper['currentStep']).toBe(0);
    });
  });

  describe('isComplete()', () => {
    it('should return true if at last step', () => {
      const stepper = new Stepper({ steps, currentStep: 2 });
      expect(stepper.isComplete()).toBe(true);
    });

    it('should return false if not at last step', () => {
      const stepper = new Stepper({ steps, currentStep: 1 });
      expect(stepper.isComplete()).toBe(false);
    });
  });

  describe('draw()', () => {
    it('should draw horizontal layout by default', () => {
      const stepper = new Stepper({ steps, currentStep: 1 });
      const result = stepper.draw(defaultContext);
      expect(result.length).toBeGreaterThan(0);
      // Should contain connectors like "─" and markers
      expect(result.some(l => l.includes('○'))).toBe(true); // current
    });

    it('should draw vertical when vertical=true', () => {
      const stepper = new Stepper({ steps, currentStep: 0, vertical: true });
      const result = stepper.draw(defaultContext);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const stepper = new Stepper({ steps, currentStep: 0 });
      expect(() => stepper.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle single step', () => {
      const stepper = new Stepper({ steps: [steps[0]], currentStep: 0 });
      expect(stepper.isComplete()).toBe(true);
      const result = stepper.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle empty steps', () => {
      const stepper = new Stepper({ steps: [], currentStep: 0 });
      expect(stepper.draw(defaultContext)).toEqual([]);
    });
  });
});