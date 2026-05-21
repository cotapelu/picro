// SPDX-License-Identifier: Apache-2.0
/**
 * Session Picker for --resume flag (CLI mode).
 * Uses readline to select a session from the current project.
 */

import * as readline from 'node:readline';
import type { SessionInfo } from "../session/session-manager";

/** Sessions loader function type */
export type SessionsLoader = (onProgress?: (info: any) => void) => Promise<SessionInfo[]>;

/** Show CLI session selector and return selected session path or null if cancelled */
export async function selectSession(
  sessionsLoader: SessionsLoader
): Promise<string | null> {
  const sessions = await sessionsLoader();

  if (sessions.length === 0) {
    console.log("No sessions found.");
    return null;
  }

  // Display sessions as a numbered list
  console.log("\nAvailable sessions:");
  sessions.forEach((session, index) => {
    const displayName = session.name || session.firstMessage?.substring(0, 50) || session.id;
    console.log(`  ${index + 1}) ${displayName} (${session.cwd})`);
  });
  console.log("  0) Cancel\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Select session number: ", (answer) => {
      rl.close();
      const num = parseInt(answer, 10);
      if (num === 0) {
        resolve(null);
      } else if (num >= 1 && num <= sessions.length) {
        resolve(sessions[num - 1].path);
      } else {
        console.log("Invalid selection.");
        resolve(null);
      }
    });
  });
}
