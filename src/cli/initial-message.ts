// SPDX-License-Identifier: Apache-2.0
/**
 * Build the initial message for the agent from stdin, file contents, and CLI arguments.
 */

import type { ImageContent } from "../llm";
import type { Args } from "../runtime/cli-args";

export interface InitialMessageInput {
  parsed: Args;
  fileText?: string;
  fileImages?: ImageContent[];
  stdinContent?: string;
}

export interface InitialMessageResult {
  initialMessage?: string;
  initialImages?: ImageContent[];
}

/**
 * Combine stdin, file text, and the first CLI message into a single
 * initial prompt. The first message from parsed.messages is consumed
 * (removed from the array).
 */
export function buildInitialMessage(input: InitialMessageInput): InitialMessageResult {
  const { parsed, fileText, fileImages, stdinContent } = input;
  const parts: string[] = [];

  if (stdinContent !== undefined) {
    parts.push(stdinContent);
  }
  if (fileText) {
    parts.push(fileText);
  }

  let firstMessage: string | undefined;
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
