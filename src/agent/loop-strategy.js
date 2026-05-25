// SPDX-License-Identifier: Apache-2.0
/**
 * Loop strategies for agent behavior.
 * Different naming and structure, same conceptual strategies.
 */
/**
 * ReAct strategy: Reason + Act pattern.
 */
export class ReActLoopStrategy {
    shouldContinue(response, _state) {
        return !!(response.toolCalls && response.toolCalls.length > 0);
    }
    formatResults(results) {
        const parts = results.map((r) => {
            const status = r.hasOwnProperty('error') ? '❌ ERROR' : '✅ SUCCESS';
            return `[${status}] ${r.toolName || 'Unknown'}:\n${this.getResultText(r)}`;
        });
        return parts.join('\n\n');
    }
    getResultText(result) {
        if ('error' in result) {
            return result.error;
        }
        return result.result;
    }
    transformPrompt(prompt, state) {
        return `${prompt}\n\n[ReAct Pattern - Round ${state.round + 1}]\nThink step by step and use tools when needed.`;
    }
}
/**
 * Plan & Solve strategy.
 */
export class PlanSolveLoopStrategy {
    shouldContinue(response, _state) {
        return !!(response.toolCalls && response.toolCalls.length > 0);
    }
    formatResults(results) {
        const success = results.filter((r) => !r.hasOwnProperty('error'));
        const errors = results.filter((r) => r.hasOwnProperty('error'));
        let text = `Plan progress (${success.length} done, ${errors.length} errors):\n`;
        success.forEach((r) => {
            text += `✓ ${r.toolName}: ${r.result.substring(0, 80)}\n`;
        });
        if (errors.length > 0) {
            text += '\nErrors:\n';
            errors.forEach((r) => {
                text += `✗ ${r.toolName}: ${r.error}\n`;
            });
        }
        return text;
    }
    transformPrompt(prompt, state) {
        if (state.round === 0) {
            return `${prompt}\n\n[Planning Phase]\nPlease create a step-by-step plan before executing.`;
        }
        return `${prompt}\n\n[Execution Phase - Round ${state.round}]\nContinue with your plan.`;
    }
}
/**
 * Reflection strategy: self-critique before final.
 */
export class ReflectionLoopStrategy {
    reflectRound = 0;
    shouldContinue(response, state) {
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
    formatResults(results) {
        const success = results.filter((r) => !r.hasOwnProperty('error'));
        const errors = results.filter((r) => r.hasOwnProperty('error'));
        return `Tools executed: ${success.length} succeeded, ${errors.length} failed.\n\n${results.map((r) => `[${r.toolName}]: ${this.getResultText(r)}`).join('\n')}`;
    }
    getResultText(result) {
        if ('error' in result) {
            return result.error;
        }
        return result.result;
    }
    transformPrompt(prompt, state) {
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
export class SimpleLoopStrategy {
    shouldContinue(response, _state) {
        return !!(response.toolCalls && response.toolCalls.length > 0);
    }
    formatResults(results) {
        return results.map((r) => `${r.toolName}: ${this.getResultText(r)}`).join('\n');
    }
    getResultText(result) {
        if ('error' in result) {
            return result.error;
        }
        return result.result;
    }
    transformPrompt(prompt, _state) {
        return prompt;
    }
}
/**
 * Self-refine strategy: improve iteratively.
 */
export class SelfRefineLoopStrategy {
    phase = 'initial';
    refineCount = 0;
    maxRefines = 2;
    shouldContinue(response, state) {
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
    formatResults(results) {
        const successes = results.filter((r) => !r.hasOwnProperty('error'));
        const errors = results.filter((r) => r.hasOwnProperty('error'));
        let output = `[${this.phase.toUpperCase()} Phase - ${successes.length} ok, ${errors.length} errors]\n`;
        successes.forEach((r) => {
            output += `✓ ${r.toolName}: ${r.result.substring(0, 100)}\n`;
        });
        errors.forEach((r) => {
            output += `✗ ${r.toolName}: ${r.error}\n`;
        });
        if (this.phase === 'refine') {
            output += `\n[Refine ${this.refineCount + 1}/${this.maxRefines}]\nCritique and improve:\n1. What's missing?\n2. What's inaccurate?\n3. What additional actions?`;
        }
        return output;
    }
    transformPrompt(prompt, state) {
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
    static create(name) {
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
    static available() {
        return ['react', 'plan-solve', 'reflection', 'simple', 'self-refine'];
    }
}
