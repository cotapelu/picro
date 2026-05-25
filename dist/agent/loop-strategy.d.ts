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
export declare class ReActLoopStrategy implements LoopStrategy {
    shouldContinue(response: LLMResponse, _state: AgentRuntimeState): boolean;
    formatResults(results: ToolResult[]): string;
    private getResultText;
    transformPrompt(prompt: string, state: AgentRuntimeState): string;
}
/**
 * Plan & Solve strategy.
 */
export declare class PlanSolveLoopStrategy implements LoopStrategy {
    shouldContinue(response: LLMResponse, _state: AgentRuntimeState): boolean;
    formatResults(results: ToolResult[]): string;
    transformPrompt(prompt: string, state: AgentRuntimeState): string;
}
/**
 * Reflection strategy: self-critique before final.
 */
export declare class ReflectionLoopStrategy implements LoopStrategy {
    private reflectRound;
    shouldContinue(response: LLMResponse, state: AgentRuntimeState): boolean;
    formatResults(results: ToolResult[]): string;
    private getResultText;
    transformPrompt(prompt: string, state: AgentRuntimeState): string;
}
/**
 * Simple strategy: just continue while tool calls exist.
 */
export declare class SimpleLoopStrategy implements LoopStrategy {
    shouldContinue(response: LLMResponse, _state: AgentRuntimeState): boolean;
    formatResults(results: ToolResult[]): string;
    private getResultText;
    transformPrompt(prompt: string, _state: AgentRuntimeState): string;
}
/**
 * Self-refine strategy: improve iteratively.
 */
export declare class SelfRefineLoopStrategy implements LoopStrategy {
    private phase;
    private refineCount;
    private maxRefines;
    shouldContinue(response: LLMResponse, state: AgentRuntimeState): boolean;
    formatResults(results: ToolResult[]): string;
    transformPrompt(prompt: string, state: AgentRuntimeState): string;
}
/**
 * Strategy factory.
 */
export declare class LoopStrategyFactory {
    static create(name: 'react' | 'plan-solve' | 'reflection' | 'simple' | 'self-refine'): LoopStrategy;
    static available(): string[];
}
//# sourceMappingURL=loop-strategy.d.ts.map