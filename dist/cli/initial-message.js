"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Build the initial message for the agent from stdin, file contents, and CLI arguments.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInitialMessage = buildInitialMessage;
/**
 * Combine stdin, file text, and the first CLI message into a single
 * initial prompt. The first message from parsed.messages is consumed
 * (removed from the array).
 */
function buildInitialMessage(input) {
    const { parsed, fileText, fileImages, stdinContent } = input;
    const parts = [];
    if (stdinContent !== undefined) {
        parts.push(stdinContent);
    }
    if (fileText) {
        parts.push(fileText);
    }
    let firstMessage;
    if (parsed.messages.length > 0) {
        firstMessage = parsed.messages.shift(); // consume first
        if (firstMessage) {
            parts.push(firstMessage);
        }
    }
    return {
        initialMessage: parts.length > 0 ? parts.join("") : undefined,
        initialImages: fileImages && fileImages.length > 0 ? fileImages : undefined,
    };
}
//# sourceMappingURL=initial-message.js.map