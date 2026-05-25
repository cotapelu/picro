"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Session Picker for --resume flag (CLI mode).
 * Uses readline to select a session from the current project.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectSession = selectSession;
const readline = __importStar(require("node:readline"));
/** Show CLI session selector and return selected session path or null if cancelled */
async function selectSession(sessionsLoader) {
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
            }
            else if (num >= 1 && num <= sessions.length) {
                resolve(sessions[num - 1].path);
            }
            else {
                console.log("Invalid selection.");
                resolve(null);
            }
        });
    });
}
//# sourceMappingURL=session-picker.js.map