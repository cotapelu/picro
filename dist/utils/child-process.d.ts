/**
 * Child Process Utils - Wait for child process
 *
 * Học từ legacy mà KHÔNG copy code:
 * - waitForChildProcess - wait for process to exit without hanging
 */
import type { ChildProcess } from "node:child_process";
export declare function waitForChildProcess(child: ChildProcess): Promise<number | null>;
//# sourceMappingURL=child-process.d.ts.map