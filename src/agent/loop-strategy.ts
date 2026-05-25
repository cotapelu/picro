// SPDX-License-Identifier: Apache-2.0
/**
 * Loop strategies for agent behavior.
 * Different naming and structure, same conceptual strategies.
 */

import type { LLMResponse, AgentRuntimeState, ToolResult } from './types.js';

/**
 * Base strategy interface.
 */
export interface LoopStrategy {
  /** Determine if agent should continue to next turn. */
  shouldContinue(response: LLMResponse, state: AgentRuntimeState): boolean;

  /** Format tool results for inclusion in next prompt. */
  formatResults(results: ToolResult[]): string;

  /** Optionally transform prompt before sending to LLM. */
  transformPrompt?(prompt: string, state: AgentRuntimeState): string;
}

/**
 * ReAct strategy: Reason + Act pattern.
 */
export class ReActLoopStrategy implements LoopStrategy {
  shouldContinue(response: LLMResponse, _state: AgentRuntimeState): boolean {
    return !!(response.toolCalls && response.toolCalls.length > 0);
  }

  formatResults(results: ToolResult[]): string {
    const parts = results.map((r) => {
      const status = r.hasOwnProperty('error') ? '❌ ERROR' : '✅ SUCCESS';
      return `[${status}] ${(r as any).toolName || 'Unknown'}:\n${this.getResultText(r)}`;
    });
    return parts.join('\n\n');
  }

  private getResultText(result: ToolResult): string {
    if ('error' in result) {
      return (result as any).error;
    }
    return (result as any).result;
  }

  transformPrompt(prompt: string, state: AgentRuntimeState): string {
    return `${prompt}\n\n[ReAct Pattern - Round ${state.round + 1}]\nThink step by step and use tools when needed.`;
  }
}

/**
 * Plan & Solve strategy.
 */
export class PlanSolveLoopStrategy implements LoopStrategy {
  shouldContinue(response: LLMResponse, _state: AgentRuntimeState): boolean {
    return !!(response.toolCalls && response.toolCalls.length > 0);
  }

  formatResults(results: ToolResult[]): string {
    const success = results.filter((r) => !r.hasOwnProperty('error'));
    const errors = results.filter((r) => r.hasOwnProperty('error'));

    let text = `Plan progress (${success.length} done, ${errors.length} errors):\n`;
    success.forEach((r) => {
      text += `✓ ${(r as any).toolName}: ${(r as any).result.substring(0, 80)}\n`;
    });
    if (errors.length > 0) {
      text += '\nErrors:\n';
      errors.forEach((r) => {
        text += `✗ ${(r as any).toolName}: ${(r as any).error}\n`;
      });
    }
    return text;
  }

  transformPrompt(prompt: string, state: AgentRuntimeState): string {
    if (state.round === 0) {
      return `${prompt}\n\n[Planning Phase]\nPlease create a step-by-step plan before executing.`;
    }
    return `${prompt}\n\n[Execution Phase - Round ${state.round}]\nContinue with your plan.`;
  }
}

/**
 * Reflection strategy: self-critique before final.
 */
export class ReflectionLoopStrategy implements LoopStrategy {
  private reflectRound = 0;

  shouldContinue(response: LLMResponse, state: AgentRuntimeState): boolean {
    if (response.toolCalls && response.toolCalls.length > 0) {
      this.reflectRound = 0;
      return true;
    }
    if (this.reflectRound < 1 && state.toolResults.length > 0) {
      this.reflectRound++;
      return true;
    }
    return false;
  }

  formatResults(results: ToolResult[]): string {
    const success = results.filter((r) => !r.hasOwnProperty('error'));
    const errors = results.filter((r) => r.hasOwnProperty('error'));
    return `Tools executed: ${success.length} succeeded, ${errors.length} failed.\n\n${results.map((r) => `[${(r as any).toolName}]: ${this.getResultText(r)}`).join('\n')}`;
  }

  private getResultText(result: ToolResult): string {
    if ('error' in result) {
      return (result as any).error;
    }
    return (result as any).result;
  }

  transformPrompt(prompt: string, state: AgentRuntimeState): string {
    if (state.toolResults.length > 0 && this.reflectRound === 0) {
      return `${prompt}\n\n[Reflection]\nReview gathered information. Identify gaps and take additional action if needed.`;
    }
    if (this.reflectRound >= 1) {
      return `${prompt}\n\n[Final Answer]\nAfter reflection, provide a comprehensive answer.`;
    }
    return prompt;
  }
}

/**
 * Simple strategy: just continue while tool calls exist.
 */
export class SimpleLoopStrategy implements LoopStrategy {
  shouldContinue(response: LLMResponse, _state: AgentRuntimeState): boolean {
    return !!(response.toolCalls && response.toolCalls.length > 0);
  }

  formatResults(results: ToolResult[]): string {
    return results.map((r) => `${(r as any).toolName}: ${this.getResultText(r)}`).join('\n');
  }

  private getResultText(result: ToolResult): string {
    if ('error' in result) {
      return (result as any).error;
    }
    return (result as any).result;
  }

  transformPrompt(prompt: string, _state: AgentRuntimeState): string {
    return prompt;
  }
}

/**
 * Self-refine strategy: improve iteratively.
 */
export class SelfRefineLoopStrategy implements LoopStrategy {
  private phase: 'initial' | 'refine' | 'final' = 'initial';
  private refineCount = 0;
  private maxRefines = 2;

  shouldContinue(response: LLMResponse, state: AgentRuntimeState): boolean {
    if (this.phase === 'initial') {
      if (response.toolCalls && response.toolCalls.length > 0) {
        return true;
      }
      if (state.toolResults.length > 0) {
        this.phase = 'refine';
        this.refineCount = 1; // Count this as first refinement
        return true;
      }
      return false;
    }

    if (this.phase === 'refine') {
      if (response.toolCalls && response.toolCalls.length > 0) {
        this.refineCount++;
        if (this.refineCount >= this.maxRefines) {
          this.phase = 'final';
          return false;
        }
        return true;
      }
      if (this.refineCount < this.maxRefines) {
        this.refineCount++;
        return true;
      }
      this.phase = 'final';
      return false;
    }

    return false;
  }

  formatResults(results: ToolResult[]): string {
    const successes = results.filter((r) => !r.hasOwnProperty('error'));
    const errors = results.filter((r) => r.hasOwnProperty('error'));

    let output = `[${this.phase.toUpperCase()} Phase - ${successes.length} ok, ${errors.length} errors]\n`;
    successes.forEach((r) => {
      output += `✓ ${(r as any).toolName}: ${(r as any).result.substring(0, 100)}\n`;
    });
    errors.forEach((r) => {
      output += `✗ ${(r as any).toolName}: ${(r as any).error}\n`;
    });

    if (this.phase === 'refine') {
      output += `\n[Refine ${this.refineCount + 1}/${this.maxRefines}]\nCritique and improve:\n1. What's missing?\n2. What's inaccurate?\n3. What additional actions?`;
    }

    return output;
  }

  transformPrompt(prompt: string, state: AgentRuntimeState): string {
    if (this.phase === 'initial' && state.round === 0) {
      return `[Objective] ${prompt}\n\nProcess:\n1. Initial Execution: gather information\n2. Self-Refinement: improve results\n3. Final Answer: comprehensive output`;
    }
    if (this.phase === 'refine') {
      return `[Refinement - Iteration ${this.refineCount + 1}/${this.maxRefines}] ${prompt}\n\nCritique previous results and improve.`;
    }
    if (this.phase === 'final') {
      return `[Final Synthesis] ${prompt}\n\nProvide a complete, accurate answer.`;
    }
    return prompt;
  }
}

/**
 * Strategy factory.
 */
export class LoopStrategyFactory {
  static create(name: 'react' | 'plan-solve' | 'reflection' | 'simple' | 'self-refine'): LoopStrategy {
    switch (name) {
      case 'react':
        return new ReActLoopStrategy();
      case 'plan-solve':
        return new PlanSolveLoopStrategy();
      case 'reflection':
        return new ReflectionLoopStrategy();
      case 'simple':
        return new SimpleLoopStrategy();
      case 'self-refine':
        return new SelfRefineLoopStrategy();
      default:
        return new ReActLoopStrategy();
    }
  }

  static available(): string[] {
    return ['react', 'plan-solve', 'reflection', 'simple', 'self-refine'];
  }
}
