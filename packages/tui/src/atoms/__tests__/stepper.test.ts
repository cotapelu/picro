import { describe, it, expect } from 'vitest';
import { Stepper } from '../stepper.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Stepper Component', () => {
  it('should render current step out of total', () => {
    const stepper = new Stepper(2, 5);
    const ctx = createContext(80, 24);
    const result = stepper.draw(ctx);

    expect(result.join('\n')).toContain('2/5');
  });

  it('should handle step 1', () => {
    const stepper = new Stepper(1, 3);
    const ctx = createContext(80, 24);
    const result = stepper.draw(ctx);

    expect(result.join('\n')).toContain('1/3');
  });

  it('should handle last step', () => {
    const stepper = new Stepper(5, 5);
    const ctx = createContext(80, 24);
    const result = stepper.draw(ctx);

    expect(result.join('\n')).toContain('5/5');
  });

  it('should update step', () => {
    const stepper = new Stepper(1, 5);
    stepper.setStep(3);
    const ctx = createContext(80, 24);
    const result = stepper.draw(ctx);

    expect(result.join('\n')).toContain('3/5');
  });
});
