// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for initial-message.ts
 */

import { describe, it, expect } from "vitest";
import { buildInitialMessage } from "./initial-message";
import type { Args } from "../runtime/cli-args";

function createArgs(overrides: Partial<Args> = {}): Args {
  return {
    messages: [],
    fileArgs: [],
    unknownFlags: new Map(),
    diagnostics: [],
    ...overrides,
  } as Args;
}

describe("buildInitialMessage", () => {
  it("should return undefined when no inputs", () => {
    const result = buildInitialMessage({ parsed: createArgs() });
    expect(result.initialMessage).toBeUndefined();
    expect(result.initialImages).toBeUndefined();
  });

  it("should use only stdin when provided", () => {
    const result = buildInitialMessage({
      parsed: createArgs(),
      stdinContent: "stdin text",
    });
    expect(result.initialMessage).toBe("stdin text");
  });

  it("should use only fileText when provided", () => {
    const result = buildInitialMessage({
      parsed: createArgs(),
      fileText: "file content",
    });
    expect(result.initialMessage).toBe("file content");
  });

  it("should use only first message when provided", () => {
    const args = createArgs({ messages: ["msg1", "msg2"] });
    const result = buildInitialMessage({ parsed: args });
    expect(result.initialMessage).toBe("msg1");
    expect(args.messages).toEqual(["msg2"]); // shifted
  });

  it("should combine stdin, fileText, and first message in order", () => {
    const args = createArgs({ messages: ["hello"] });
    const result = buildInitialMessage({
      parsed: args,
      stdinContent: "stdin\n",
      fileText: "file\n",
    });
    expect(result.initialMessage).toBe("stdin\nfile\nhello");
    expect(args.messages).toHaveLength(0);
  });

  it("should include initialImages when provided", () => {
    const images = [{ type: "image", mimeType: "image/png", data: "abc" }] as any[];
    const result = buildInitialMessage({
      parsed: createArgs({ messages: ["test"] }),
      fileImages: images,
    });
    expect(result.initialImages).toBe(images);
  });

  it("should not include initialImages when not provided", () => {
    const result = buildInitialMessage({
      parsed: createArgs({ messages: ["test"] }),
    });
    expect(result.initialImages).toBeUndefined();
  });

  it("should handle empty messages array after shift", () => {
    const args = createArgs({ messages: ["only"] });
    const result = buildInitialMessage({ parsed: args });
    expect(result.initialMessage).toBe("only");
    expect(args.messages).toHaveLength(0);
  });
});
