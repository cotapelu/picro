// SPDX-License-Identifier: Apache-2.0
/**
 * Session Picker for --resume flag.
 * Shows a TUI to select a session from the current project.
 */

import { ProcessTerminal, TerminalUI } from "../tui";
import { SessionSelector } from "../tui/molecules/session-selector";
import type { SessionInfo } from "../session/session-manager";

/** Sessions loader function type */
export type SessionsLoader = (onProgress?: (info: any) => void) => Promise<SessionInfo[]>;

/** Show TUI session selector and return selected session path or null if cancelled */
export async function selectSession(
  sessionsLoader: SessionsLoader
): Promise<string | null> {
  return new Promise((resolve) => {
    // Load sessions
    sessionsLoader().then(sessions => {
      if (sessions.length === 0) {
        console.log("No sessions found.");
        resolve(null);
        return;
      }

      // Create UI
      const terminal = new ProcessTerminal();
      const ui = new TerminalUI(terminal);
      let settled = false;

      const settle = (result: string | null) => {
        if (settled) return;
        settled = true;
        ui.stop();
        resolve(result);
      };

      // Adapt to molecule's expected interface
      const adapted = sessions.map(s => ({
        ...s,
        updatedAt: s.modified,
        name: s.name || (s.firstMessage ? s.firstMessage.substring(0, 30) : s.id),
      }));

      const selector = new SessionSelector({
        sessions: adapted,
        onSelect: (session) => {
          settle(session.path || session.id);
        },
        onCancel: () => settle(null),
      });

      ui.append(selector);
      ui.setFocus(selector);
      ui.start();

      // Render initial
      ui.requestRender();
    }).catch(err => {
      console.error("Failed to load sessions:", err);
      resolve(null);
    });
  });
}
