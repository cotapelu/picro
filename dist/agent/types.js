"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Core type definitions for the agent system.
 * Designed independently with a different structure from pi-agent-legacy.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isToolTurn = exports.isAssistantTurn = exports.isUserTurn = exports.isSystemTurn = void 0;
// Helper to check turn types
const isSystemTurn = (turn) => turn.role === 'system';
exports.isSystemTurn = isSystemTurn;
const isUserTurn = (turn) => turn.role === 'user';
exports.isUserTurn = isUserTurn;
const isAssistantTurn = (turn) => turn.role === 'assistant';
exports.isAssistantTurn = isAssistantTurn;
const isToolTurn = (turn) => turn.role === 'tool';
exports.isToolTurn = isToolTurn;
//# sourceMappingURL=types.js.map