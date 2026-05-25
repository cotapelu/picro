// SPDX-License-Identifier: Apache-2.0
/**
 * Core type definitions for the agent system.
 * Designed independently with a different structure from pi-agent-legacy.
 */
// Helper to check turn types
export const isSystemTurn = (turn) => turn.role === 'system';
export const isUserTurn = (turn) => turn.role === 'user';
export const isAssistantTurn = (turn) => turn.role === 'assistant';
export const isToolTurn = (turn) => turn.role === 'tool';
