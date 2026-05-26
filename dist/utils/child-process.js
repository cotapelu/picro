"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Child Process Utils - Wait for child process
 *
 * Học từ legacy mà KHÔNG copy code:
 * - waitForChildProcess - wait for process to exit without hanging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForChildProcess = waitForChildProcess;
const EXIT_STDIO_GRACE_MS = 100;
function waitForChildProcess(child) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let exited = false;
        let exitCode = null;
        let postExitTimer;
        let stdoutEnded = child.stdout === null;
        let stderrEnded = child.stderr === null;
        const cleanup = () => {
            if (postExitTimer) {
                clearTimeout(postExitTimer);
                postExitTimer = undefined;
            }
            child.removeListener("error", onError);
            child.removeListener("exit", onExit);
            child.removeListener("close", onClose);
            child.stdout?.removeListener("end", onStdoutEnd);
            child.stderr?.removeListener("end", onStderrEnd);
        };
        const finalize = (code) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            child.stdout?.destroy();
            child.stderr?.destroy();
            resolve(code);
        };
        const maybeFinalizeAfterExit = () => {
            if (!exited || settled)
                return;
            if (stdoutEnded && stderrEnded) {
                finalize(exitCode);
            }
        };
        const onStdoutEnd = () => {
            stdoutEnded = true;
            maybeFinalizeAfterExit();
        };
        const onStderrEnd = () => {
            stderrEnded = true;
            maybeFinalizeAfterExit();
        };
        const onError = (err) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            reject(err);
        };
        const onExit = (code) => {
            exited = true;
            exitCode = code;
            maybeFinalizeAfterExit();
            if (!settled) {
                postExitTimer = setTimeout(() => finalize(code), EXIT_STDIO_GRACE_MS);
            }
        };
        const onClose = (code) => {
            finalize(code);
        };
        child.stdout?.once("end", onStdoutEnd);
        child.stderr?.once("end", onStderrEnd);
        child.once("error", onError);
        child.once("exit", onExit);
        child.once("close", onClose);
    });
}
//# sourceMappingURL=child-process.js.map