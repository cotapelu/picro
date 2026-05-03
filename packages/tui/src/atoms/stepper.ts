/**
 * Stepper/Wizard Component
 * Multi-step form navigation
 */
import type { UIElement, RenderContext } from './base.js';
import { visibleWidth, truncateText } from './internal-utils.js';

export interface Step {
  id: string;
  label: string;
  description?: string;
  optional?: boolean;
  completed?: boolean;
}

export interface StepperTheme {
  completedColor: (s: string) => string;
  currentColor: (s: string) => string;
  pendingColor: (s: string) => string;
  optionalColor: (s: string) => string;
  connectorColor: (s: string) => string;
  dimColor: (s: string) => string;
}

export const stepperDefaultTheme: StepperTheme = {
  completedColor: (s) => `\x1b[32m${s}\x1b[0m`,
  currentColor: (s) => `\x1b[1;36m${s}\x1b[0m`,
  pendingColor: (s) => `\x1b[90m${s}\x1b[0m`,
  optionalColor: (s) => `\x1b[2m${s}\x1b[0m`,
  connectorColor: (s) => `\x1b[90m${s}\x1b[0m`,
  dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
};

export interface StepperOptions {
  steps: Step[];
  currentStep: number;
  theme?: Partial<StepperTheme>;
  showDescription?: boolean;
  vertical?: boolean;
}

export class Stepper implements UIElement {
  private steps: Step[];
  private currentStep: number;
  private theme: StepperTheme;
  private showDescription: boolean;
  private vertical: boolean;

  constructor(options: StepperOptions) {
    this.steps = options.steps;
    this.currentStep = Math.max(0, Math.min(options.currentStep, options.steps.length - 1));
    this.theme = { ...stepperDefaultTheme, ...options.theme };
    this.showDescription = options.showDescription ?? true;
    this.vertical = options.vertical ?? false;
  }

  setCurrentStep(step: number): void {
    this.currentStep = Math.max(0, Math.min(step, this.steps.length - 1));
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  isComplete(): boolean {
    return this.currentStep >= this.steps.length - 1;
  }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    if (this.vertical) {
      return this.drawVertical(context);
    }
    return this.drawHorizontal(context);
  }

  private drawHorizontal(context: RenderContext): string[] {
    const lines: string[] = [];
    const parts: string[] = [];
    
    this.steps.forEach((step, index) => {
      const isCurrent = index === this.currentStep;
      const isCompleted = step.completed || index < this.currentStep;
      const isPending = index > this.currentStep;

      let marker: string;
      if (isCompleted) {
        marker = this.theme.completedColor('●');
      } else if (isCurrent) {
        marker = this.theme.currentColor('○');
      } else {
        marker = this.theme.pendingColor('○');
      }

      const label = isCurrent 
        ? this.theme.currentColor(step.label)
        : isCompleted 
          ? this.theme.completedColor(step.label)
          : this.theme.pendingColor(step.label);

      const optional = step.optional && !isCompleted ? this.theme.optionalColor(' (opt)') : '';
      
      parts.push(`${marker} ${label}${optional}`);
      
      if (index < this.steps.length - 1) {
        parts.push(this.theme.connectorColor('→'));
      }
    });

    const line = parts.join(' ');
    lines.push(truncateText(line, context.width, '…'));

    if (this.showDescription) {
      const currentStep = this.steps[this.currentStep];
      if (currentStep?.description) {
        const desc = this.theme.dimColor(currentStep.description);
        lines.push(truncateText(desc, context.width, '…'));
      }
    }

    return lines;
  }

  private drawVertical(context: RenderContext): string[] {
    const lines: string[] = [];
    
    this.steps.forEach((step, index) => {
      const isCurrent = index === this.currentStep;
      const isCompleted = step.completed || index < this.currentStep;

      let marker: string;
      if (isCompleted) {
        marker = this.theme.completedColor('●');
      } else if (isCurrent) {
        marker = this.theme.currentColor('○');
      } else {
        marker = this.theme.pendingColor('○');
      }

      const label = isCurrent 
        ? this.theme.currentColor(step.label)
        : isCompleted 
          ? this.theme.completedColor(step.label)
          : this.theme.pendingColor(step.label);

      const connector = index < this.steps.length - 1 ? this.theme.connectorColor('│') : ' ';
      
      lines.push(`${marker} ${label}`);
      
      if (this.showDescription && step.description) {
        const desc = `  ${this.theme.dimColor(step.description)}`;
        lines.push(truncateText(desc, context.width, '…'));
      }
      
      if (index < this.steps.length - 1) {
        lines.push(this.theme.dimColor(`${connector} `));
      }
    });

    return lines;
  }
}
