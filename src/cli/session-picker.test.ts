// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for session-picker.ts with mocked UI
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock the TUI and SessionSelector modules before importing module under test
vi.mock("../tui", () => {
  const mockUI = vi.fn().mockImplementation(function() {
    return {
      append: vi.fn(),
      setFocus: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      requestRender: vi.fn(),
    };
  });
  return {
    ProcessTerminal: vi.fn(),
    TerminalUI: mockUI,
  };
});

vi.mock("../tui/molecules/session-selector", () => {
  const mockSel = vi.fn().mockImplementation(function(opts: any) {
    // Store options for test access
    (global as any).__sessionSelectorOptions = opts;
  });
  return { SessionSelector: mockSel };
});

import { selectSession } from "./session-picker";
import type { SessionInfo } from "../session/session-manager";

describe("selectSession", () => {
  let mockSelectorOptions: any;

  beforeEach(() => {
    mockSelectorOptions = undefined;
    (global as any).__sessionSelectorOptions = undefined;
    vi.clearAllMocks();
  });

  async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
  }

  it("should resolve null when loader returns empty list", async () => {
    const loader = vi.fn().mockResolvedValue([] as SessionInfo[]);
    const result = await selectSession(loader);
    expect(result).toBeNull();
    // UI should not have been created
    const TerminalUI = (await import("../tui")).TerminalUI;
    expect(TerminalUI).not.toHaveBeenCalled();
  });

  it("should create UI and selector when sessions available", async () => {
    const sessions: SessionInfo[] = [
      {
        path: "/sess1.jsonl",
        id: "abc123",
        cwd: "/project",
        modified: new Date(),
        name: "Session 1",
        created: new Date(),
        messageCount: 5,
        firstMessage: "Hello",
        allMessagesText: "",
      },
    ];
    const loader = vi.fn().mockResolvedValue(sessions);
    const promise = selectSession(loader);

    // Wait for loader and UI creation
    await flushPromises();

    const TerminalUI = (await import("../tui")).TerminalUI;
    expect(TerminalUI).toHaveBeenCalledTimes(1);

    mockSelectorOptions = (global as any).__sessionSelectorOptions;
    expect(mockSelectorOptions).toBeDefined();
    expect(mockSelectorOptions.sessions).toHaveLength(1);
    expect(mockSelectorOptions.sessions[0].path).toBe("/sess1.jsonl");

    // Simulate user selecting
    mockSelectorOptions.onSelect(mockSelectorOptions.sessions[0]);

    const result = await promise;
    expect(result).toBe("/sess1.jsonl");
  });

  it("should resolve null when user cancels", async () => {
    const sessions: SessionInfo[] = [
      {
        path: "/sess1.jsonl",
        id: "abc",
        cwd: "/project",
        modified: new Date(),
        name: "Sess",
        created: new Date(),
        messageCount: 1,
        firstMessage: "",
        allMessagesText: "",
      },
    ];
    const loader = vi.fn().mockResolvedValue(sessions);
    const promise = selectSession(loader);
    await flushPromises();

    mockSelectorOptions = (global as any).__sessionSelectorOptions;
    // Simulate cancel
    mockSelectorOptions.onCancel();
    const result = await promise;
    expect(result).toBeNull();
  });
});
