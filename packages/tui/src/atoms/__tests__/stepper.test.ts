import { describe, it, expect } from 'vitest';
import { Stepper, type Step } from '../stepper.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Stepper', () => {
  it('should render steps with current', () => {
    const steps: Step[] = [
      { id: '1', label: 'First' },
      { id: '2', label: 'Second' },
      { id: '3', label: 'Third' },
    ];
    const stepper = new Stepper({ steps, currentStep: 1 });
    const ctx = createContext(80, 24);
    const result = stepper.draw(ctx);

    expect(result.some(l => l.includes('First'))).toBe(true);
    expect(result.some(l => l.includes('Second'))).toBe(true);
    expect(result.some(l => l.includes('Third'))).toBe(true);
  });

  it('should display steps', () => {
    const stepper = new Stepper({
      steps: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      currentStep: 0,
    });
    const ctx = createContext(80, 24);
    const result = stepper.draw(ctx);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should display steps', () => {
    const stepper = new Stepper({
      steps: [{ id: 'a', label: 'A' }],
      currentStep: 0,
    });
    const ctx = createContext(80, 24);
    const result = stepper.draw(ctx);
    expect(result.length).toBeGreaterThan(0);
  });
});
