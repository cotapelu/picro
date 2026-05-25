/**
 * Session Picker for --resume flag (CLI mode).
 * Uses readline to select a session from the current project.
 */
import type { SessionInfo } from "../session/session-manager.js";
/** Sessions loader function type */
export type SessionsLoader = (onProgress?: (info: any) => void) => Promise<SessionInfo[]>;
/** Show CLI session selector and return selected session path or null if cancelled */
export declare function selectSession(sessionsLoader: SessionsLoader): Promise<string | null>;
//# sourceMappingURL=session-picker.d.ts.map